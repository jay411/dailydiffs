'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePuzzle } from '@/hooks/usePuzzle';
import { useGameState, clearRoundStartTime } from '@/hooks/useGameState';
import { useGameSession } from '@/contexts/GameSessionContext';
import { GameCanvas } from '@/components/GameCanvas';
import { Timer } from '@/components/Timer';
import { getPuzzleDateForNow } from '@/lib/puzzle-date';
import type { LeaderboardEntry } from '@/app/api/leaderboard/route';

const RANK_EMOJI = ['🥇', '🥈', '🥉'];

function rankColor(rank: number) {
  if (rank === 1) return 'text-amber-400 font-bold';
  if (rank === 2) return 'text-slate-400';
  if (rank === 3) return 'text-amber-700';
  return 'text-slate-500';
}

type GroupInfo = {
  id: string;
  name: string;
  invite_code: string;
};

type GroupEntry = {
  rank: number | null;
  username: string;
  score: number | null;
  time_seconds: number | null;
  is_current_user: boolean;
};

export default function PlayRoundPage() {
  const params = useParams();
  const router = useRouter();
  const round = Number(params?.round) || 1;
  const { puzzleDate } = getPuzzleDateForNow();
  const { puzzle, loading, error } = usePuzzle(puzzleDate, round);
  const totalDiffs = puzzle?.differences_json?.length ?? 5;
  const { foundIndices, markFound, allFound, timeSeconds } = useGameState(totalDiffs, {
    puzzleDate,
    round,
  });
  const { addRoundResult } = useGameSession();
  const [activeSheet, setActiveSheet] = useState<'scores' | 'group' | 'share' | null>(null);

  // Leaderboard state
  const [lbEntries, setLbEntries] = useState<LeaderboardEntry[]>([]);
  const [lbLoaded, setLbLoaded] = useState(false);

  // Groups state
  const [myGroup, setMyGroup] = useState<GroupInfo | null>(null);
  const [groupEntries, setGroupEntries] = useState<GroupEntry[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupTab, setGroupTab] = useState<'create' | 'join'>('create');
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);

  // Load leaderboard
  useEffect(() => {
    fetch(`/api/leaderboard?date=${puzzleDate}&limit=5`)
      .then((r) => r.json())
      .then((data: { entries?: LeaderboardEntry[] }) => {
        if (data.entries) setLbEntries(data.entries);
      })
      .catch(() => {})
      .finally(() => setLbLoaded(true));
  }, [puzzleDate]);

  // Load user's group (from localStorage cache then API)
  useEffect(() => {
    const cached = localStorage.getItem('dailydiffs_group');
    if (cached) {
      try {
        const g = JSON.parse(cached) as GroupInfo;
        setMyGroup(g);
        fetchGroupLeaderboard(g.id);
      } catch {}
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchGroupLeaderboard = useCallback(async (groupId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/leaderboard`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.entries) setGroupEntries(data.entries);
    } catch {}
  }, []);

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-slate-900">
        <p className="text-slate-400 animate-pulse">Loading puzzle…</p>
      </div>
    );
  }

  if (error || !puzzle) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-4 bg-slate-900">
        <p className="text-red-400">{error || 'Puzzle not found'}</p>
        <Link href="/play/1" className="text-emerald-500 hover:underline">Try again</Link>
      </div>
    );
  }

  const differences = puzzle.differences_json;

  function handleContinue() {
    addRoundResult({
      round,
      differencesFound: foundIndices.size,
      totalDifferences: differences.length,
      timeSeconds,
    });
    clearRoundStartTime(puzzleDate, round);
    if (round === 1) {
      router.push('/auth/login?next=/play/2');
    } else {
      router.push(round < 5 ? `/play/transition?from=${round}` : '/results');
    }
  }

  async function handleCreateGroup() {
    if (!groupName.trim()) return;
    setGroupLoading(true);
    setGroupError('');
    try {
      const res = await fetch('/api/groups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGroupError(data.error ?? 'Failed to create group');
        return;
      }
      const g: GroupInfo = data.group;
      setMyGroup(g);
      localStorage.setItem('dailydiffs_group', JSON.stringify(g));
      fetchGroupLeaderboard(g.id);
      setShowGroupModal(false);
      setGroupName('');
    } catch {
      setGroupError('Network error');
    } finally {
      setGroupLoading(false);
    }
  }

  async function handleJoinGroup() {
    if (!inviteCode.trim()) return;
    setGroupLoading(true);
    setGroupError('');
    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: inviteCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGroupError(data.error ?? 'Invalid invite code');
        return;
      }
      const g: GroupInfo = data.group;
      setMyGroup(g);
      localStorage.setItem('dailydiffs_group', JSON.stringify(g));
      fetchGroupLeaderboard(g.id);
      setShowGroupModal(false);
      setInviteCode('');
    } catch {
      setGroupError('Network error');
    } finally {
      setGroupLoading(false);
    }
  }

  function handleCopyInvite() {
    if (!myGroup) return;
    const url = `${window.location.origin}/play/1?join=${myGroup.invite_code}`;
    navigator.clipboard.writeText(url).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    });
  }

  // Ticker text — duplicated for seamless scroll
  const lbForTicker = lbLoaded && lbEntries.length > 0 ? lbEntries : [];
  const tickerSegment =
    lbForTicker.length > 0
      ? lbForTicker
          .map(
            (e) =>
              `${RANK_EMOJI[e.rank - 1] ?? `${e.rank}.`} @${e.username} — ${e.score.toLocaleString()} pts${e.streak > 0 ? ` 🔥${e.streak}` : ''}`,
          )
          .join('   ·   ')
      : '⏳ Loading today\'s scores…';

  // Group modal
  const GroupModal = showGroupModal ? (
    <div
      className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
      onClick={() => setShowGroupModal(false)}
    >
      <div
        className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-slate-100 font-bold text-lg mb-4">
          {myGroup ? `Group: ${myGroup.name}` : 'Create or Join a Group'}
        </h2>

        {myGroup ? (
          <div className="flex flex-col gap-3">
            <p className="text-slate-400 text-sm">
              Invite code: <span className="font-mono text-emerald-400">{myGroup.invite_code}</span>
            </p>
            <button
              type="button"
              onClick={handleCopyInvite}
              className="rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm py-2.5 transition-colors"
            >
              {inviteCopied ? '✓ Copied!' : '🔗 Copy invite link'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMyGroup(null);
                setGroupEntries([]);
                localStorage.removeItem('dailydiffs_group');
                setShowGroupModal(false);
              }}
              className="text-xs text-slate-600 hover:text-red-400 transition-colors mt-1"
            >
              Leave group
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setGroupTab('create')}
                className={`flex-1 text-sm py-2 rounded-lg transition-colors ${groupTab === 'create' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'}`}
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setGroupTab('join')}
                className={`flex-1 text-sm py-2 rounded-lg transition-colors ${groupTab === 'join' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'}`}
              >
                Join
              </button>
            </div>

            {groupTab === 'create' ? (
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={50}
                  className="bg-slate-700 text-slate-100 placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleCreateGroup}
                  disabled={groupLoading || !groupName.trim()}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 text-sm transition-colors"
                >
                  {groupLoading ? 'Creating…' : 'Create Group'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Invite code (e.g. A1B2C3D4)"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="bg-slate-700 text-slate-100 placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm font-mono outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleJoinGroup}
                  disabled={groupLoading || !inviteCode.trim()}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2.5 text-sm transition-colors"
                >
                  {groupLoading ? 'Joining…' : 'Join Group'}
                </button>
              </div>
            )}

            {groupError && (
              <p className="text-red-400 text-xs mt-2">{groupError}</p>
            )}
          </>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="h-dvh flex flex-col bg-slate-900 overflow-hidden">
      {GroupModal}

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-4 h-12 bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <span className="font-extrabold text-base tracking-tight text-slate-100">DailyDiffs</span>
        <span className="text-slate-400 text-sm">Round {round}/5 · {puzzle.art_style}</span>
        <Timer seconds={timeSeconds} />
      </header>

      {/* ── Subheader — streak + username ── */}
      <div className="flex items-center gap-3 px-4 h-9 bg-slate-800/50 border-b border-slate-700/40 flex-shrink-0">
        <span className="bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs font-semibold px-2.5 py-0.5 rounded-full">
          🔥 — streak
        </span>
        <span className="text-xs text-slate-500 ml-auto hidden sm:block">Next puzzle: 8 AM</span>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex min-h-0">

        {/* Left panel — desktop only */}
        <aside className="hidden xl:flex w-60 bg-slate-800/40 border-r border-slate-700/40 flex-col p-4 gap-5 flex-shrink-0 overflow-y-auto">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
              Today&apos;s Top
            </p>
            {!lbLoaded ? (
              <p className="text-xs text-slate-600 italic">Loading…</p>
            ) : lbEntries.length === 0 ? (
              <p className="text-xs text-slate-600 italic">No scores yet today</p>
            ) : (
              lbEntries.map((e) => (
                <div
                  key={e.rank}
                  className={`flex justify-between items-center py-1.5 border-b border-slate-700/40 text-sm ${e.is_current_user ? 'bg-emerald-950/30 -mx-2 px-2 rounded' : ''}`}
                >
                  <span className="text-slate-300 truncate max-w-[130px]">
                    {RANK_EMOJI[e.rank - 1] ?? `${e.rank}.`} @{e.username}
                    {e.is_current_user && <span className="text-emerald-500 text-[10px] ml-1">you</span>}
                  </span>
                  <span className={rankColor(e.rank)}>{e.score.toLocaleString()}</span>
                </div>
              ))
            )}
            <Link
              href="/leaderboard"
              className="block mt-2 text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
            >
              View full leaderboard →
            </Link>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              My Group
            </p>
            {myGroup ? (
              <>
                <p className="text-xs text-slate-400 font-semibold mb-2">{myGroup.name}</p>
                {groupEntries.slice(0, 5).map((e, i) => (
                  <div
                    key={i}
                    className={`flex justify-between items-center py-1 border-b border-slate-700/40 text-xs ${e.is_current_user ? 'text-emerald-400' : 'text-slate-400'}`}
                  >
                    <span className="truncate max-w-[110px]">
                      {e.rank ? `${e.rank}.` : '–'} @{e.username}
                    </span>
                    <span>{e.score != null ? e.score.toLocaleString() : '—'}</span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setShowGroupModal(true)}
                  className="mt-2 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Invite friends →
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-600 italic mb-2">No group yet</p>
                <button
                  type="button"
                  onClick={() => setShowGroupModal(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  + Create or join a group
                </button>
              </>
            )}
          </div>
        </aside>

        {/* Center — game canvas */}
        <main className="flex-1 flex flex-col items-center justify-start xl:justify-center px-4 pt-4 pb-3 gap-3 min-w-0 min-h-0">
          <GameCanvas
            imageOriginalUrl={puzzle.image_original_url}
            imageModifiedUrl={puzzle.image_modified_url}
            differences={differences}
            foundIndices={foundIndices}
            onFound={markFound}
          />

          {/* Progress dots */}
          <div className="flex gap-2" aria-label="Difference progress">
            {differences.map((_, i) => (
              <span
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                  foundIndices.has(i) ? 'bg-emerald-500' : 'bg-slate-600'
                }`}
              />
            ))}
          </div>

          {/* Completion banner */}
          {allFound && (
            <div className="flex flex-col items-center gap-3 mt-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <p className="text-base font-semibold text-emerald-400">
                All {differences.length} found in {timeSeconds}s! 🎉
              </p>
              <button
                type="button"
                onClick={handleContinue}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold py-3 px-8 transition-all"
              >
                {round === 1
                  ? 'Continue — sign in to save score'
                  : round < 5
                  ? 'Next Round →'
                  : 'See Results'}
              </button>
            </div>
          )}
        </main>

        {/* Right panel — desktop only */}
        <aside className="hidden xl:flex w-44 bg-slate-800/40 border-l border-slate-700/40 flex-col p-4 gap-4 flex-shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              Share
            </p>
            <div className="flex gap-2">
              {[
                { icon: '𝕏', label: 'Twitter' },
                { icon: '📋', label: 'Copy' },
                { icon: '🔗', label: 'Link' },
              ].map(({ icon, label }) => (
                <button
                  key={label}
                  type="button"
                  title={label}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg py-2 text-sm transition-colors"
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          {/* Ad slot */}
          <div className="flex-1 bg-slate-900/60 border border-dashed border-slate-700/60 rounded-xl flex items-center justify-center">
            <span className="text-[10px] text-slate-700 uppercase tracking-widest rotate-0">
              Ad
            </span>
          </div>
        </aside>
      </div>

      {/* ── Bottom ticker — desktop only ── */}
      <div className="hidden xl:flex h-9 bg-slate-800/60 border-t border-slate-700/40 overflow-hidden items-center flex-shrink-0">
        <div
          className="whitespace-nowrap flex text-xs text-slate-500"
          style={{ animation: 'ticker 30s linear infinite' }}
        >
          <span className="pr-16">🏆&nbsp;&nbsp;{tickerSegment}</span>
          <span className="pr-16">🏆&nbsp;&nbsp;{tickerSegment}</span>
        </div>
      </div>

      {/* ── Mobile ad strip ── */}
      <div className="xl:hidden mx-3 mb-1.5 h-11 bg-slate-800/50 border border-dashed border-slate-700/40 rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] text-slate-700 uppercase tracking-widest">Advertisement</span>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="xl:hidden flex h-14 bg-slate-800 border-t border-slate-700 flex-shrink-0">
        {(
          [
            { id: null, icon: '🎮', label: 'Game' },
            { id: 'scores', icon: '🏆', label: 'Scores' },
            { id: 'group', icon: '👥', label: 'Group' },
            { id: 'share', icon: '↗️', label: 'Share' },
          ] as const
        ).map(({ id, icon, label }) => {
          const isActive = id === null ? activeSheet === null : activeSheet === id;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setActiveSheet(id === null ? null : activeSheet === id ? null : id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? 'text-sky-400' : 'text-slate-500'
              }`}
            >
              <span className="text-xl">{icon}</span>
              <span className="text-[9px] font-bold uppercase tracking-wide">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Mobile bottom sheets ── */}
      {activeSheet && (
        <div
          className="xl:hidden fixed inset-0 z-50 bg-black/40"
          onClick={() => setActiveSheet(null)}
        >
          <div
            className="absolute bottom-14 left-0 right-0 bg-slate-800 border-t border-slate-700 rounded-t-2xl pt-3 px-4 pb-6 max-h-[65vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-4" />

            {activeSheet === 'scores' && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                  Today&apos;s Leaderboard
                </p>
                {!lbLoaded ? (
                  <p className="text-xs text-slate-600 italic">Loading…</p>
                ) : lbEntries.length === 0 ? (
                  <p className="text-xs text-slate-600 italic">No scores yet today</p>
                ) : (
                  lbEntries.map((e) => (
                    <div
                      key={e.rank}
                      className={`flex justify-between items-center py-2.5 border-b border-slate-700/60 text-sm ${e.is_current_user ? 'text-emerald-400' : ''}`}
                    >
                      <span className="text-slate-300">
                        {RANK_EMOJI[e.rank - 1] ?? `${e.rank}.`} @{e.username}
                        {e.is_current_user && <span className="text-[10px] ml-1">(you)</span>}
                      </span>
                      <span className={rankColor(e.rank)}>{e.score.toLocaleString()}</span>
                    </div>
                  ))
                )}
                <Link
                  href="/leaderboard"
                  className="block mt-3 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  onClick={() => setActiveSheet(null)}
                >
                  View full leaderboard →
                </Link>
              </>
            )}

            {activeSheet === 'group' && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                  My Group
                </p>
                {myGroup ? (
                  <>
                    <p className="text-sm text-slate-200 font-semibold mb-3">{myGroup.name}</p>
                    {groupEntries.map((e, i) => (
                      <div
                        key={i}
                        className={`flex justify-between items-center py-2 border-b border-slate-700/60 text-sm ${e.is_current_user ? 'text-emerald-400' : 'text-slate-300'}`}
                      >
                        <span>{e.rank ? `${e.rank}.` : '–'} @{e.username}</span>
                        <span>{e.score != null ? e.score.toLocaleString() : '—'}</span>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowGroupModal(true)}
                      className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      🔗 Invite friends
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-slate-600 italic mb-3">No group yet</p>
                    <button
                      type="button"
                      onClick={() => { setActiveSheet(null); setShowGroupModal(true); }}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      + Create or join a group
                    </button>
                  </>
                )}
              </>
            )}

            {activeSheet === 'share' && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                  Share Result
                </p>
                <div className="flex gap-3">
                  {[
                    { icon: '𝕏', label: 'Twitter' },
                    { icon: '📋', label: 'Copy' },
                    { icon: '🔗', label: 'Link' },
                  ].map(({ icon, label }) => (
                    <button
                      key={label}
                      type="button"
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl py-5 text-xl transition-colors"
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

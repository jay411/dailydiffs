export interface Difference {
  x: number;
  y: number;
  radius: number;
  description?: string;
}

export interface Puzzle {
  id: string;
  date: string;
  round_number: number;
  art_style: string;
  image_original_url: string;
  image_modified_url: string;
  differences_json: Difference[];
  difficulty_score?: number;
  status: string;
}

export interface PuzzleRow {
  id: string;
  date: string;
  round_number: number;
  art_style: string;
  image_original_url: string;
  image_modified_url: string;
  differences_json: unknown;
  difficulty_score?: number;
  status: string;
}

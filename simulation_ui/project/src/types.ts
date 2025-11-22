// Branch management with collision-free positioning and stats
export interface Branch {
  id: number;
  slot: number; // position in vertical stack (for ordering)
  startYOffset: number; // where the branch started (parent's position at split)
  targetYOffset: number; // final diverged position
  stickmanGif: HTMLImageElement;
  createdAt: number; // timelineOffset when branch was created
  // Stats
  money: number;
  monthlyWage: number;
  maritalStatus: string;
  childCount: number; // Changed from hasChildren boolean to count
}

// Event system
export interface GameEvent {
  id: number;
  branchId: number; // which branch this event is on
  monthIndex: number; // which month marker (i value in drawMarkers)
  eventName: string; // name from eventConfig (e.g., "layoff", "inheritance")
  description: string; // description from eventConfig
  triggered: boolean; // has the stickman passed this event?
  causesSplit?: boolean; // life-altering events
  reactionType: 'emoji' | 'image'; // type of reaction to show
  reactionContent: string; // emoji character or path to PNG
  apiData?: {
    monthlyWage?: number;
    maritalStatus?: string;
    childCount?: number;
    ttsAudioId?: string; // Audio ID from audio service
    ttsDuration?: number; // TTS duration in seconds
  }; // Data from API to apply when event triggers
}

export interface Reaction {
  branchId: number;
  startOffset: number; // timelineOffset when reaction started
  duration: number; // how long to show (in timeline offset units)
  reactionType: 'emoji' | 'image'; // type of reaction
  reactionContent: string; // emoji or image path
}

export interface BranchStats {
  money: number;
  monthlyWage: number;
  maritalStatus: string;
  childCount: number;
}
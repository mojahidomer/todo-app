import type { ReactElement } from 'react';

interface ConflictBannerProps {
  onApplyLatest: () => void;
  onKeepMine: () => void;
}

export const ConflictBanner = ({ onApplyLatest, onKeepMine }: ConflictBannerProps): ReactElement => (
  <div className="mb-4 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm" role="alert">
    <p className="font-medium text-amber-800">This task was updated in the background.</p>
    <p className="text-amber-700 mt-0.5">Use the latest version or keep your edits.</p>
    <div className="flex gap-2 mt-3">
      <button
        type="button"
        onClick={onApplyLatest}
        className="px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
      >
        Use latest
      </button>
      <button
        type="button"
        onClick={onKeepMine}
        className="px-3 py-1.5 text-xs font-medium border border-amber-400 text-amber-700 rounded-md hover:bg-amber-100 transition-colors"
      >
        Keep my changes
      </button>
    </div>
  </div>
);

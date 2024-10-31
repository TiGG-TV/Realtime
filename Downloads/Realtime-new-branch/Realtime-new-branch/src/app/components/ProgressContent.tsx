'use client';

import { Profile } from '@/types/types';

interface ProgressContentProps {
  selectedProfile: Profile | null;
  onProfileSelect: (profile: Profile) => void;
}

const ProgressContent: React.FC<ProgressContentProps> = ({
  selectedProfile,
  onProfileSelect
}) => {
  // ... existing code ...

  return (
    <div className={`h-full overflow-y-auto p-4`}>
      {/* Your existing progress content */}
    </div>
  );
};

export default ProgressContent;

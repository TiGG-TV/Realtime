import React, { useEffect, useState } from 'react';
import { Profile } from '../../types/types';
import { ScoringResult } from '../../types/conversationScorer';
import { MoreHorizontal, ChevronDown } from 'react-feather';
import { Button } from "@/app/components/ui/button";
import { useMediaQuery } from 'react-responsive';
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { auth } from '../../types/firebase';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/components/ui/collapsible";
import { Skeleton } from "@/app/components/ui/skeleton";

interface ProfileSidebarProps {
  profile: Profile | null;
  score: ScoringResult | null;
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  isGeneratingScore?: boolean;
}

export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
  profile,
  score,
  isOpen,
  onClose,
  onOpen,
  isGeneratingScore = false,
}) => {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const [highestScore, setHighestScore] = useState<number | null>(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isImprovementOpen, setIsImprovementOpen] = useState(false);
  const firestore = getFirestore();

  useEffect(() => {
    if (score) {
      setIsFeedbackOpen(false);
      setIsImprovementOpen(false);
    }
  }, [score]);

  useEffect(() => {
    const fetchHighestScore = async () => {
      const user = auth.currentUser;
      if (user && profile) {
        const highestScoreRef = doc(firestore, 'highestScores', `${user.uid}_${profile.id}`);
        const highestScoreDoc = await getDoc(highestScoreRef);
        if (highestScoreDoc.exists()) {
          setHighestScore(highestScoreDoc.data().score);
        }
      }
    };

    fetchHighestScore();
  }, [profile]);

  if (!isOpen && !isMobile) return null;

  return (
    <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto`}>
      <div className="p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <MoreHorizontal size={24} />
        </button>
        <h2 className="text-2xl font-bold mb-6">Profile</h2>
        {profile && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={profile.imageUrl} alt={profile.name} />
                <AvatarFallback>{profile.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{profile.name}</h3>
                {profile.category && <p className="text-sm text-gray-500">{profile.category}</p>}
              </div>
            </div>
            {profile.scenarioDescription && (
              <div>
                <h4 className="text-lg font-semibold mb-2">Scenario Description</h4>
                <p className="text-sm text-gray-700">{profile.scenarioDescription}</p>
              </div>
            )}
            {highestScore !== null && (
              <div className="mt-4">
                <h4 className="text-lg font-semibold">Highest Score</h4>
                <p className="text-2xl font-bold">{highestScore}</p>
              </div>
            )}
          </div>
        )}
        {isGeneratingScore ? (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Generating Score...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-8 w-24" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : score && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Conversation Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{score.score}</span>
                  <Badge variant={score.score >= 80 ? "default" : score.score >= 60 ? "secondary" : "destructive"}>
                    {score.score >= 80 ? "Excellent" : score.score >= 60 ? "Good" : "Needs Improvement"}
                  </Badge>
                </div>

                <Collapsible open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="flex w-full justify-between p-0 hover:bg-transparent">
                      <h4 className="font-semibold">Feedback</h4>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isFeedbackOpen ? 'transform rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                      {score.feedback.map((item, index) => (
                        <li key={index} className="text-sm text-gray-600">{item}</li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={isImprovementOpen} onOpenChange={setIsImprovementOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="flex w-full justify-between p-0 hover:bg-transparent">
                      <h4 className="font-semibold">Areas for Improvement</h4>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isImprovementOpen ? 'transform rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                      {score.areasForImprovement.map((item, index) => (
                        <li key={index} className="text-sm text-gray-600">{item}</li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

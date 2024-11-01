'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { auth } from '../../types/firebase';
import { getFirestore, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { ScrollArea } from "../components/ui/scroll-area";
import { Filter, ArrowLeft, CheckCircle, ArrowUpCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import Sidebar from '../components/sidebar';
import { allProfiles as predefinedProfiles } from '../../types/profileUtils';
import { Profile as BaseProfile } from '../../types/types';

// Console log to catch errors early
console.log('ProgressPage component loaded');

interface ScoreData {
  category: string;
  score: number;
  timestamp: Date;
  profileId: string;
}

interface ChatData {
  name: string;
  description: string;
  score: number;
  category: string;
  timestamp: Date;
  profileId: string;
  transcript: string;
  feedback: string[];
  areasForImprovement: string[];
  imageUrl: string;
}

interface AverageScoreData {
  date: string;
  averageScore: number;
}

interface CategoryScore {
  category: string;
  averageScore: number;
}

// Add this interface for structured feedback
interface QualitativeFeedback {
  strength: string;
  weakness: string;
}

// Add these feedback mapping functions
const getQualitativeFeedback = (scores: ScoreData[], chats: ChatData[]): QualitativeFeedback[] => {
  const feedbackPoints: QualitativeFeedback[] = [];
  
  // Analyze conversation patterns
  const allFeedback = chats.flatMap(chat => chat.feedback || []);
  const allAreasForImprovement = chats.flatMap(chat => chat.areasForImprovement || []);
  
  // Common patterns to look for in feedback
  const patterns = {
    questioning: {
      strength: ["good questions", "insightful questions", "probing questions"],
      weakness: ["ask more questions", "deeper questions", "follow-up questions"]
    },
    listening: {
      strength: ["active listening", "attentive", "understood well"],
      weakness: ["listen more", "pay attention", "understand better"]
    },
    engagement: {
      strength: ["engaging", "enthusiastic", "interactive"],
      weakness: ["more engaged", "show interest", "participate more"]
    },
    clarity: {
      strength: ["clear communication", "articulate", "well-expressed"],
      weakness: ["clearer responses", "express better", "articulate better"]
    },
    depth: {
      strength: ["detailed responses", "thorough", "comprehensive"],
      weakness: ["elaborate more", "provide details", "expand answers"]
    }
  };

  // Helper function to check if feedback matches any pattern
  const matchesPattern = (text: string, keywords: string[]): boolean => {
    return keywords.some(keyword => text.toLowerCase().includes(keyword));
  };

  // Analyze feedback for patterns
  Object.entries(patterns).forEach(([skill, { strength: strengthPatterns, weakness: weaknessPatterns }]) => {
    const hasStrength = allFeedback.some(feedback => matchesPattern(feedback, strengthPatterns));
    const hasWeakness = allAreasForImprovement.some(area => matchesPattern(area, weaknessPatterns));
    
    if (hasStrength) {
      switch(skill) {
        case 'questioning':
          feedbackPoints.push({
            strength: "You're great at asking insightful questions",
            weakness: "Try to ask more follow-up questions to deepen conversations"
          });
          break;
        case 'listening':
          feedbackPoints.push({
            strength: "You show strong active listening skills",
            weakness: "Practice reflecting back what you hear to show understanding"
          });
          break;
        case 'engagement':
          feedbackPoints.push({
            strength: "You maintain engaging and interactive conversations",
            weakness: "Work on consistent engagement throughout longer conversations"
          });
          break;
        case 'clarity':
          feedbackPoints.push({
            strength: "You communicate your thoughts clearly and effectively",
            weakness: "Try to be more concise while maintaining clarity"
          });
          break;
        case 'depth':
          feedbackPoints.push({
            strength: "You provide detailed and thorough responses",
            weakness: "Focus on balancing detail with conversation flow"
          });
          break;
      }
    } else if (hasWeakness) {
      switch(skill) {
        case 'questioning':
          feedbackPoints.push({
            strength: "You're developing your questioning technique",
            weakness: "Work on asking more probing and follow-up questions"
          });
          break;
        case 'listening':
          feedbackPoints.push({
            strength: "You're showing improvement in listening skills",
            weakness: "Practice active listening and engagement with responses"
          });
          break;
        case 'engagement':
          feedbackPoints.push({
            strength: "You're building better conversation engagement",
            weakness: "Try to show more enthusiasm and interest in discussions"
          });
          break;
        case 'clarity':
          feedbackPoints.push({
            strength: "You're working on clearer communication",
            weakness: "Focus on organizing your thoughts before responding"
          });
          break;
        case 'depth':
          feedbackPoints.push({
            strength: "You're improving in providing detailed responses",
            weakness: "Try to elaborate more on your key points"
          });
          break;
      }
    }
  });

  // If no patterns were found, provide default feedback
  if (feedbackPoints.length === 0) {
    feedbackPoints.push({
      strength: "Keep practicing to discover your conversation strengths",
      weakness: "Engage in more conversations to identify areas for improvement"
    });
  }

  return feedbackPoints.slice(0, 3); // Return top 3 feedback points
};

const categories = [
  "SmallTalk",
  "SalesPitch", 
  "PublicSpeaking",
  "Negotiation",
  "Dating",
  "CustomerService",
  "Debate",
  "Interview"
];

// Add new interfaces
interface LeaderboardEntry {
  username: string;
  highScore: number;
  averageScore: number;
  chatCount: number;
  rank: number;
  userId: string;
}

interface LeaderboardState {
  entries: LeaderboardEntry[];
  totalPages: number;
  currentPage: number;
  currentUserRank?: LeaderboardEntry;
}

// Add this interface near the top with other interfaces
interface UserStats {
  scores: number[];
  chatCount: number;
  username: string;
}

// Add this function after the interface definitions and before the component
const getCategoryName = (category: string): string => {
  // Add spaces before capital letters and capitalize first letter
  const formatted = category
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .trim() // Remove leading/trailing spaces
    .replace(/^\w/, c => c.toUpperCase()); // Capitalize first letter
  
  return formatted;
};

export const ProgressPage: React.FC = () => {
  const [isClient, setIsClient] = useState(false);
  const [averageScores, setAverageScores] = useState<AverageScoreData[]>([]);
  const [recentChats, setRecentChats] = useState<ChatData[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [filter, setFilter] = useState("All");
  const [selectedChat, setSelectedChat] = useState<ChatData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardState>({
    entries: [],
    totalPages: 1,
    currentPage: 1
  });
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const ITEMS_PER_PAGE = 10;
  const firestore = useMemo(() => getFirestore(), []);

  const filteredChats = useMemo(() => {
    if (!recentChats) return [];
    if (filter === "All") return recentChats;
    return recentChats.filter(chat => chat.category === filter);
  }, [recentChats, filter]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) {
        console.log('No authenticated user');
        return;
      }

      try {
        const recentChatsData = await fetchRecentChatsWithHighScores(user.uid);
        if (recentChatsData.length > 0) {
          setRecentChats(recentChatsData);
        }

        const scoresRef = collection(firestore, 'scores');
        const q = query(
          scoresRef, 
          where('userId', '==', user.uid), 
          orderBy('timestamp', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const scores: ScoreData[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.timestamp) {
            scores.push({
              category: data.category || 'Uncategorized',
              score: data.score || 0,
              timestamp: data.timestamp.toDate(),
              profileId: data.profileId || '',
            });
          }
        });

        const processedData = processScoresIntoAverageScores(scores);
        setAverageScores(processedData);

        const feedbackPoints = getQualitativeFeedback(scores, recentChatsData);
        setStrengths(feedbackPoints.map(fp => fp.strength));
        setWeaknesses(feedbackPoints.map(fp => fp.weakness));

      } catch (error) {
        console.error('Error fetching data:', error);
        setStrengths(['Keep practicing to discover your conversation strengths']);
        setWeaknesses(['Engage in more conversations to identify areas for improvement']);
      }
    };

    fetchData();
  }, [isClient, firestore]);

  const processScoresIntoAverageScores = (scores: ScoreData[]): AverageScoreData[] => {
    const scoresByDate: { [date: string]: number[] } = {};
    scores.forEach((score) => {
      const date = score.timestamp.toISOString().split('T')[0];
      if (!scoresByDate[date]) {
        scoresByDate[date] = [];
      }
      scoresByDate[date].push(score.score);
    });

    return Object.entries(scoresByDate).map(([date, scores]) => ({
      date,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    })).sort((a, b) => a.date.localeCompare(b.date));
  };

  const fetchRecentChatsWithHighScores = async (userId: string): Promise<ChatData[]> => {
    console.log('Fetching recent chats for user:', userId);
    try {
      const chatsRef = collection(firestore, 'chats');
      const chatsQuery = query(
        chatsRef, 
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      
      const chatsSnapshot = await getDocs(chatsQuery);
      console.log('Number of chat documents:', chatsSnapshot.docs.length);

      const chats: ChatData[] = chatsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          name: data.name || 'Unknown',
          description: data.description || '',
          score: data.score || 0,
          category: data.category || 'Uncategorized',
          timestamp: data.timestamp?.toDate() || new Date(),
          profileId: data.profileId || '',
          transcript: data.transcript || '',
          feedback: Array.isArray(data.feedback) ? data.feedback : [],
          areasForImprovement: Array.isArray(data.areasForImprovement) ? data.areasForImprovement : [],
          imageUrl: data.imageUrl || '',
        };
      });

      console.log('Processed chat data:', chats);
      return chats;
    } catch (error) {
      console.error('Error fetching recent chats:', error);
      return [];
    }
  };

  const calculateCategoryScores = (scores: ScoreData[]): CategoryScore[] => {
    if (!scores || scores.length === 0) {
      return [];
    }

    const categoryScores: { [category: string]: number[] } = {};
    
    scores.forEach((score) => {
      const category = score.category || 'Uncategorized';
      if (!categoryScores[category]) {
        categoryScores[category] = [];
      }
      if (!isNaN(score.score)) {
        categoryScores[category].push(score.score);
      }
    });

    return Object.entries(categoryScores)
      .filter(([_, scores]) => scores.length > 0)
      .map(([category, scores]) => ({
        category,
        averageScore: scores.reduce((a, b) => a + b, 0) / scores.length
      }));
  };

  const calculateStrengthsAndWeaknesses = (categoryScores: CategoryScore[]): { strengths: string[], weaknesses: string[] } => {
    // Add validation to ensure we have scores
    if (!categoryScores || categoryScores.length === 0) {
      return {
        strengths: ['Practice more conversations to discover your strengths'],
        weaknesses: ['Complete more conversations to identify areas for improvement']
      };
    }

    const sortedScores = [...categoryScores].sort((a, b) => b.averageScore - a.averageScore);
    
    // Only get categories that have actual scores
    const validCategories = sortedScores.filter(score => !isNaN(score.averageScore));
    
    const strengths = validCategories.slice(0, 3).map(score => 
      `${score.category} (${Math.round(score.averageScore)}%)`
    );
    
    const weaknesses = validCategories.slice(-3).reverse().map(score => 
      `${score.category} (${Math.round(score.averageScore)}%)`
    );

    // If we don't have enough data, provide default messages
    if (strengths.length === 0) {
      strengths.push('Practice more conversations to discover your strengths');
    }
    if (weaknesses.length === 0) {
      weaknesses.push('Complete more conversations to identify areas for improvement');
    }

    return { strengths, weaknesses };
  };

  // Add this function to fetch leaderboard data
  const fetchLeaderboardData = async (page: number) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // First get all chats
      const chatsRef = collection(firestore, 'chats');
      let baseQuery = query(chatsRef);
      
      // Apply filters if selected
      if (selectedCategory !== "All") {
        baseQuery = query(baseQuery, where('category', '==', selectedCategory));
      }
      if (selectedProfileId) {
        baseQuery = query(baseQuery, where('profileId', '==', selectedProfileId));
      }

      const snapshot = await getDocs(baseQuery);
      console.log('Found chat documents:', snapshot.docs.length);
      
      // Group chats by userId from the auth profile
      const userStats = new Map<string, UserStats>();

      // Get all unique user IDs from chats
      const userIds = new Set<string>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.userId) {
          userIds.add(data.userId);
        }
      });

      // Fetch user data for all users
      const usersRef = collection(firestore, 'users');
      const usersSnapshot = await getDocs(query(usersRef, where('userId', 'in', Array.from(userIds))));
      const userMap = new Map();
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        userMap.set(userData.userId, userData.username || 'Anonymous');
      });

      // Now process chats with user data
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const userId = data.userId;
        if (!userId) return; // Skip chats without userId

        const stats: UserStats = userStats.get(userId) || {
          scores: [] as number[],
          chatCount: 0,
          username: userMap.get(userId) || 'Anonymous'
        };
        
        if (typeof data.score === 'number') {
          stats.scores.push(data.score);
        }
        stats.chatCount++;
        userStats.set(userId, stats);
      });

      // Convert to LeaderboardEntry array and sort
      const entries: LeaderboardEntry[] = Array.from(userStats.entries()).map(([userId, stats]) => ({
        userId,
        username: stats.username,
        highScore: Math.max(...stats.scores),
        averageScore: stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length,
        chatCount: stats.chatCount,
        rank: 0 // Will be set after sorting
      }));

      // Sort by high score
      entries.sort((a, b) => b.highScore - a.highScore);
      
      // Assign ranks
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      // Find current user's entry
      const currentUserEntry = entries.find(entry => entry.userId === user.uid);

      // Paginate results
      const totalPages = Math.ceil(entries.length / ITEMS_PER_PAGE);
      const paginatedEntries = entries.slice(
        (page - 1) * ITEMS_PER_PAGE,
        page * ITEMS_PER_PAGE
      );

      setLeaderboard({
        entries: paginatedEntries,
        totalPages,
        currentPage: page,
        currentUserRank: currentUserEntry
      });

    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  // Add new useEffect for leaderboard
  useEffect(() => {
    fetchLeaderboardData(1); // Fetch first page of leaderboard data
  }, [selectedCategory, selectedProfileId]); // Re-fetch when filters change

  const renderContent = () => {
    if (!isClient) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      );
    }

    return (
      <div className="flex h-screen bg-white">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <div className="p-4 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <div>
                  <CardTitle className="text-2xl font-bold">Leaderboard</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    See how you rank against other users
                  </p>
                </div>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="min-w-[120px]">
                        <Filter className="w-4 h-4 mr-2" />
                        {selectedCategory}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                      <DropdownMenuItem onSelect={() => setSelectedCategory("All")}>
                        All Categories
                      </DropdownMenuItem>
                      {categories.map((category) => (
                        <DropdownMenuItem 
                          key={category} 
                          onSelect={() => setSelectedCategory(category)}
                        >
                          {getCategoryName(category)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {selectedCategory !== "All" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="min-w-[120px]">
                          {selectedProfileId ? 
                            predefinedProfiles.find((p: BaseProfile) => p.id === selectedProfileId)?.name : 
                            'Select Profile'
                          }
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[200px]">
                        {predefinedProfiles
                          .filter((profile: BaseProfile) => profile.category === selectedCategory)
                          .map((profile: BaseProfile) => (
                            <DropdownMenuItem 
                              key={profile.id} 
                              onSelect={() => setSelectedProfileId(profile.id)}
                            >
                              {profile.name}
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Current User's Rank (if not in current page) */}
                  {leaderboard.currentUserRank && 
                   !leaderboard.entries.some(e => e.userId === auth.currentUser?.uid) && (
                    <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-100">
                      <p className="font-semibold text-blue-900 mb-2">Your Ranking</p>
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-blue-600">Rank</p>
                          <p className="text-xl font-bold text-blue-900">#{leaderboard.currentUserRank.rank}</p>
                        </div>
                        <div>
                          <p className="text-sm text-blue-600">High Score</p>
                          <p className="text-xl font-bold text-blue-900">{leaderboard.currentUserRank.highScore.toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-blue-600">Avg Score</p>
                          <p className="text-xl font-bold text-blue-900">{leaderboard.currentUserRank.averageScore.toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-blue-600">Chats</p>
                          <p className="text-xl font-bold text-blue-900">{leaderboard.currentUserRank.chatCount}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Leaderboard Table */}
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Rank</th>
                          <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Username</th>
                          <th className="px-4 py-3 text-right font-semibold text-muted-foreground">High Score</th>
                          <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Avg Score</th>
                          <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Chats</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.entries.map((entry, index) => (
                          <tr 
                            key={entry.userId}
                            className={`border-t hover:bg-muted/50 transition-colors ${
                              entry.userId === auth.currentUser?.uid 
                                ? 'bg-blue-50 hover:bg-blue-100' 
                                : ''
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {index < 3 && (
                                  <span className={`
                                    w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold
                                    ${index === 0 ? 'bg-yellow-100 text-yellow-700' : ''}
                                    ${index === 1 ? 'bg-gray-100 text-gray-700' : ''}
                                    ${index === 2 ? 'bg-orange-100 text-orange-700' : ''}
                                  `}>
                                    {index + 1}
                                  </span>
                                )}
                                {index >= 3 && <span className="text-muted-foreground">{entry.rank}</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-medium">{entry.username}</td>
                            <td className="px-4 py-3 text-right font-semibold">{entry.highScore.toFixed(1)}</td>
                            <td className="px-4 py-3 text-right">{entry.averageScore.toFixed(1)}</td>
                            <td className="px-4 py-3 text-right">{entry.chatCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchLeaderboardData(leaderboard.currentPage - 1)}
                      disabled={leaderboard.currentPage === 1}
                      className="flex items-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {leaderboard.currentPage} of {leaderboard.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchLeaderboardData(leaderboard.currentPage + 1)}
                      disabled={leaderboard.currentPage === leaderboard.totalPages}
                      className="flex items-center gap-2"
                    >
                      Next
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-green-50">
                <CardHeader>
                  <CardTitle>Top Strengths</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {strengths.map((strength, index) => (
                      <li key={index} className="flex items-center">
                        <Badge variant="default" className="mr-2">✓</Badge>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-red-50">
                <CardHeader>
                  <CardTitle>Areas for Improvement</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {weaknesses.map((weakness, index) => (
                      <li key={index} className="flex items-center">
                        <Badge variant="destructive" className="mr-2">△</Badge>
                        {weakness}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{selectedChat ? selectedChat.name : "Recent Chats"}</CardTitle>
                {selectedChat ? (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedChat(null)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Chats
                  </Button>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-full">
                        <Filter className="w-4 h-4 mr-2" />
                        {filter === "All" ? filter : getCategoryName(filter)}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onSelect={() => setFilter("All")}>
                        All
                      </DropdownMenuItem>
                      {categories.map((category) => (
                        <DropdownMenuItem 
                          key={category} 
                          onSelect={() => setFilter(category)}
                        >
                          {getCategoryName(category)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  {selectedChat ? (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                          {selectedChat.imageUrl ? (
                            <img src={selectedChat.imageUrl} alt={selectedChat.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl">{selectedChat.name[0]}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{selectedChat.name}</h3>
                          <p className="text-sm text-gray-500">{selectedChat.category}</p>
                        </div>
                        <div className="ml-auto">
                          <Badge variant="secondary" className="text-lg">{selectedChat.score}</Badge>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Feedback:</h4>
                        <ul className="list-disc pl-5 mb-4">
                          {selectedChat.feedback.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Areas for Improvement:</h4>
                        <ul className="list-disc pl-5">
                          {selectedChat.areasForImprovement.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    // Change from ul to div to avoid hydration issues
                    <div className="space-y-4">
                      {filteredChats.map((chat) => (
                        <div key={chat.profileId}>
                          <Button 
                            variant="ghost"
                            className="w-full justify-start rounded-full hover:bg-gray-100 transition-colors duration-200 h-16 px-4"
                            onClick={() => setSelectedChat(chat)}
                          >
                            <div className="flex items-center space-x-4 w-full">
                              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                {chat.imageUrl ? (
                                  <img src={chat.imageUrl} alt={chat.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-xl">{chat.name[0]}</span>
                                )}
                              </div>
                              <div className="flex-grow text-left">
                                <h3 className="font-semibold">{chat.name}</h3>
                                <p className="text-sm text-gray-500">{chat.category}</p>
                              </div>
                              <div className="text-lg font-semibold">{chat.score}</div>
                            </div>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  return renderContent();
};

export default ProgressPage;

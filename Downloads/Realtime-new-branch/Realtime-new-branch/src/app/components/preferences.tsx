'use client';

import { useState } from 'react';
import { Button } from "@/app/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";

export function Preferences() {
  const [theme, setTheme] = useState('system');

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">Language</label>
        <Select defaultValue="english">
          <SelectTrigger id="language">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="english">English</SelectItem>
            <SelectItem value="spanish">Spanish</SelectItem>
            <SelectItem value="french">French</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Theme</p>
        <div className="flex space-x-2">
          <Button 
            variant={theme === 'system' ? 'default' : 'outline'} 
            onClick={() => setTheme('system')}
          >
            System
          </Button>
          <Button 
            variant={theme === 'light' ? 'default' : 'outline'} 
            onClick={() => setTheme('light')}
          >
            Light
          </Button>
          <Button 
            variant={theme === 'dark' ? 'default' : 'outline'} 
            onClick={() => setTheme('dark')}
          >
            Dark
          </Button>
        </div>
      </div>
    </div>
  );
}

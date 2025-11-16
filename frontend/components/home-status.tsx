'use client';

import { Home, Cloud } from 'lucide-react';
import { useThermostat } from '@/lib/store';

export function HomeStatus() {
  const userState = useThermostat((s) => s.userState);

  if (!userState) {
    return null;
  }

  const isAway = userState.away === true;
  const weather = userState.weather;

  return (
    <div className="flex items-center gap-3 text-sm">
      {/* Away/Home Status */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
        <Home
          className={`h-4 w-4 ${isAway ? 'text-zinc-400' : 'text-brand-600 dark:text-brand-400'}`}
        />
        <span className={`font-medium ${isAway ? 'text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
          {isAway ? 'Away' : 'Home'}
        </span>
      </div>

      {/* Weather */}
      {weather && weather.current && weather.current.temp_f !== undefined && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
          <Cloud className="h-4 w-4 text-zinc-500" />
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {Math.round(weather.current.temp_f)}°
          </span>
          <span className="text-zinc-600 dark:text-zinc-400">
            {weather.current.condition}
          </span>
        </div>
      )}
    </div>
  );
}

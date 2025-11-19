import { GoogleGenAI } from "@google/genai";
import { MatchStats } from '../types';

export const analyzeMatch = async (stats: MatchStats, won: boolean): Promise<string> => {
  if (!process.env.API_KEY) {
    return "Gemini API Key not configured. Unable to analyze match data.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const accuracy = stats.shotsFired > 0 
      ? ((stats.shotsHit / stats.shotsFired) * 100).toFixed(1) 
      : '0';
  const duration = ((stats.endTime - stats.startTime) / 1000).toFixed(1);

  const prompt = `
    You are a Drill Sergeant analyzing a recent 1v1 combat simulation.
    
    Match Result: ${won ? 'VICTORY' : 'DEFEAT'}
    Player Kills: ${stats.playerKills}
    Enemy Kills: ${stats.enemyKills}
    Weapon Used Most: ${stats.winningWeapon}
    Accuracy: ${accuracy}% (${stats.shotsHit}/${stats.shotsFired})
    Duration: ${duration} seconds.

    Give a harsh but constructive critique of the performance in 2-3 sentences. 
    If they won, compliment their speed or aim but warn against overconfidence.
    If they lost, tell them what to improve (aim, speed, aggression).
  `;

  // Retry logic with exponential backoff for robustness against transient network/server errors
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [{ text: prompt }]
        }
      });

      if (response.text) {
        return response.text;
      }
    } catch (error) {
      console.warn(`Gemini Analysis attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) {
        return "Communication with HQ lost. Analysis unavailable.";
      }
      // Wait: 1s, 2s, 4s...
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }

  return "Analysis unavailable.";
};
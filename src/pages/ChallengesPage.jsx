import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchUserChallenges } from '../api/client';
import '../styles/challenges.css';

const ChallengesPage = () => {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadChallenges = async () => {
      if (!user) {
        console.log('No user found, cannot load challenges');
        setLoading(false);
        return;
      }
      
      console.log('Loading challenges for user:', user.userid);
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching challenges from API...');
        const data = await fetchUserChallenges(user.userid);
        console.log('Received challenges data:', data);
        setChallenges(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error in loadChallenges:', err);
        setError(err.message || 'Failed to load challenges');
      } finally {
        setLoading(false);
      }
    };

    loadChallenges();
  }, [user]);

  const getCategoryName = (categoryId) => {
    switch (categoryId) {
      case 1: return 'Daily';
      case 2: return 'Weekly';
      case 3: return 'Bi-Weekly';
      default: return 'Challenge';
    }
  };

  const groupChallengesByCategory = (challenges) => {
    const grouped = {
      daily: [],
      weekly: [],
      biweekly: []
    };

    challenges.forEach(challenge => {
      switch(challenge.category_id) {
        case 1:
          grouped.daily.push(challenge);
          break;
        case 2:
          grouped.weekly.push(challenge);
          break;
        case 3:
          grouped.biweekly.push(challenge);
          break;
        default:
          break;
      }
    });

    return grouped;
  };

  const renderChallengeCard = (challenge) => {
    const progressPercentage = Math.min(100, Math.round((challenge.progress / challenge.target) * 100));
    
    return (
      <div key={challenge.id} className="challenge-card">
        <div className="challenge-header">
          <div>
            <h3 className="challenge-title">{challenge.name}</h3>
            <span className="challenge-category">
              {getCategoryName(challenge.category_id)}
            </span>
          </div>
        </div>
        <p className="challenge-description">{challenge.description}</p>
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="progress-details">
            <span>Progress</span>
            <span className="progress-percentage">{progressPercentage}%</span>
          </div>
        </div>
        <div className="progress-details">
          <span>{challenge.progress} of {challenge.target} completed</span>
        </div>
      </div>
    );
  };

  const renderChallengeSection = (title, challenges, categoryId) => {
    if (!challenges || challenges.length === 0) {
      return (
        <div className="challenge-section">
          <div className="section-header">
            <h2>{title} Challenges</h2>
          </div>
          <div className="section-content">
            <p className="no-challenges">No {title.toLowerCase()} challenges available</p>
          </div>
        </div>
      );
    }

    return (
      <div className="challenge-section">
        <div className="section-header">
          <h2>{title} Challenges</h2>
        </div>
        <div className="section-content">
          {challenges.map(challenge => renderChallengeCard(challenge))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading challenges...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="challenges-container">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { daily, weekly, biweekly } = groupChallengesByCategory(challenges);
  const hasNoChallenges = challenges.length === 0;

  return (
    <div className="challenges-container">
      <div className="challenges-header">
        <h1>Your Challenges</h1>
        <p>Complete challenges to earn rewards and track your progress</p>
      </div>

      {hasNoChallenges ? (
        <div className="challenge-section">
          <div className="section-content">
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No challenges available</h3>
              <p className="mt-1 text-gray-500">Check back later for new challenges!</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {renderChallengeSection('Daily', daily, 1)}
          {renderChallengeSection('Weekly', weekly, 2)}
          {renderChallengeSection('Bi-Weekly', biweekly, 3)}
        </>
      )}
    </div>
  );
};

export default ChallengesPage;

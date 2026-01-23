/**
 * Analytics Service for SWE Hackers Analytics
 * 
 * Provides analytics data retrieval and computation:
 * - Fetch computed analytics from userAnalytics collection
 * - Extract learning insights and recommendations
 * - Compare users to averages and compute percentile rankings
 * 
 * Uses QueryService for cache-first data fetching.
 * Uses CacheService for result caching.
 * 
 * @example
 * // Get user's computed analytics
 * const analytics = await AnalyticsService.getUserAnalytics('user123');
 * 
 * // Get learning insights with recommendations
 * const insights = await AnalyticsService.getLearningInsights('user123');
 * 
 * @module services/analytics-service
 */

const AnalyticsService = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** Cache TTL for user analytics (5 minutes) */
  USER_ANALYTICS_TTL: 300,
  
  /** Cache TTL for course averages (15 minutes) */
  COURSE_AVERAGES_TTL: 900,
  
  /** Minimum activities needed for reliable analytics */
  MIN_ACTIVITIES_THRESHOLD: 10,
  
  // ═══════════════════════════════════════════════════════════════════════════
  // USER ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get computed analytics for a user from Firestore
   * 
   * Fetches the userAnalytics document computed by Cloud Functions.
   * Uses cache-first strategy via QueryService.
   * 
   * @param {string} userId - Firebase Auth UID of the user
   * @returns {Promise<Object|null>} User analytics document or null if not found
   * 
   * @example
   * const analytics = await AnalyticsService.getUserAnalytics('bLDCOI8o0dbwLyX5eOYHaNQMmyq1');
   * console.log(analytics.learningStyle.primary); // 'visual'
   * console.log(analytics.strengthAreas); // [{topic: 'variables', score: 0.94}, ...]
   */
  async getUserAnalytics(userId) {
    if (!userId) {
      console.error('📊 AnalyticsService: userId is required');
      return null;
    }
    
    console.log(`📊 AnalyticsService: Getting analytics for user ${userId}`);
    
    try {
      const analytics = await window.QueryService.getWithCache(
        'userAnalytics', 
        userId, 
        this.USER_ANALYTICS_TTL
      );
      
      if (analytics) {
        console.log(`📊 AnalyticsService: Found analytics for ${userId}`, {
          hasEnoughData: analytics.dataQuality?.hasEnoughData,
          activityCount: analytics.dataQuality?.activityCount,
          learningStyle: analytics.learningStyle?.primary
        });
      } else {
        console.log(`📊 AnalyticsService: No analytics found for ${userId}`);
      }
      
      return analytics;
      
    } catch (error) {
      console.error(`📊 AnalyticsService: Error fetching analytics for ${userId}:`, error);
      return null;
    }
  },
  
  /**
   * Get learning insights extracted from user analytics
   * 
   * Transforms raw analytics data into actionable insights:
   * - Formatted learning style with descriptions
   * - Prioritized strength and growth areas
   * - Engagement pattern highlights
   * - Personalized recommendations
   * 
   * @param {string} userId - Firebase Auth UID of the user
   * @returns {Promise<Object>} Learning insights object
   * 
   * @example
   * const insights = await AnalyticsService.getLearningInsights('user123');
   * console.log(insights.learningStyleFormatted); // { name: 'Visual', icon: '👁️', ... }
   */
  async getLearningInsights(userId) {
    if (!userId) {
      console.error('📊 AnalyticsService: userId is required');
      return this._getEmptyInsights();
    }
    
    console.log(`📊 AnalyticsService: Getting learning insights for ${userId}`);
    
    try {
      const analytics = await this.getUserAnalytics(userId);
      
      if (!analytics) {
        return this._getEmptyInsights();
      }
      
      // Format learning style
      const learningStyleFormatted = this._formatLearningStyle(analytics.learningStyle);
      
      // Prioritize areas
      const topStrengths = (analytics.strengthAreas || []).slice(0, 3);
      const topGrowthAreas = (analytics.growthAreas || []).slice(0, 3);
      
      // Extract engagement highlights
      const engagementHighlights = this._extractEngagementHighlights(analytics.engagementPatterns);
      
      // Generate insights object
      const insights = {
        userId,
        hasData: true,
        dataQuality: analytics.dataQuality || { hasEnoughData: false, activityCount: 0 },
        lastComputed: analytics.lastComputed,
        
        // Learning style
        learningStyle: analytics.learningStyle,
        learningStyleFormatted,
        
        // Areas
        strengthAreas: topStrengths,
        growthAreas: topGrowthAreas,
        
        // Engagement
        engagementPatterns: analytics.engagementPatterns,
        engagementHighlights,
        
        // Persistence
        persistenceMetrics: analytics.persistenceMetrics,
        
        // Summary
        summaryStats: analytics.summaryStats,
        
        // Overall health indicators
        healthIndicators: this._calculateHealthIndicators(analytics)
      };
      
      console.log(`📊 AnalyticsService: Generated insights for ${userId}`, {
        hasEnoughData: insights.dataQuality.hasEnoughData,
        learningStyle: insights.learningStyleFormatted?.name,
        strengthCount: insights.strengthAreas.length,
        growthCount: insights.growthAreas.length
      });
      
      return insights;
      
    } catch (error) {
      console.error(`📊 AnalyticsService: Error getting insights for ${userId}:`, error);
      return this._getEmptyInsights();
    }
  },
  
  /**
   * Generate personalized recommendations for a user
   * 
   * Analyzes user analytics and generates actionable recommendations:
   * - Focus areas based on growth opportunities
   * - Study time suggestions based on engagement patterns
   * - Streak reminders and motivation
   * - Next steps based on progress
   * 
   * @param {string} userId - Firebase Auth UID of the user
   * @returns {Promise<Object[]>} Array of recommendation objects
   * 
   * @example
   * const recs = await AnalyticsService.getRecommendations('user123');
   * // Returns: [{ type: 'growth', priority: 'high', icon: '🎯', title: '...', description: '...' }]
   */
  async getRecommendations(userId) {
    if (!userId) {
      console.error('📊 AnalyticsService: userId is required');
      return [];
    }
    
    console.log(`📊 AnalyticsService: Generating recommendations for ${userId}`);
    
    try {
      const analytics = await this.getUserAnalytics(userId);
      
      if (!analytics) {
        return [{
          type: 'start',
          priority: 'high',
          icon: '🚀',
          title: 'Get Started',
          description: 'Complete some activities to unlock personalized recommendations!'
        }];
      }
      
      const recommendations = [];
      
      // 1. Growth area recommendations
      if (analytics.growthAreas && analytics.growthAreas.length > 0) {
        const topGrowth = analytics.growthAreas[0];
        recommendations.push({
          type: 'growth',
          priority: 'high',
          icon: '🎯',
          title: `Focus on ${this._formatTopicName(topGrowth.topic)}`,
          description: `Your score in this area is ${Math.round(topGrowth.score * 100)}%. Practice more to improve!`,
          action: topGrowth.suggestedResources?.[0] || null,
          data: { topic: topGrowth.topic, score: topGrowth.score }
        });
      }
      
      // 2. Streak recommendations
      const patterns = analytics.engagementPatterns;
      if (patterns) {
        if (patterns.currentStreak === 0 && patterns.streakRecord > 0) {
          recommendations.push({
            type: 'streak',
            priority: 'medium',
            icon: '🔥',
            title: 'Restart Your Streak',
            description: `You've had a ${patterns.streakRecord}-day streak before. Complete an activity today!`,
            data: { streakRecord: patterns.streakRecord }
          });
        } else if (patterns.currentStreak > 0 && patterns.currentStreak < patterns.streakRecord) {
          recommendations.push({
            type: 'streak',
            priority: 'low',
            icon: '🔥',
            title: `Keep Your ${patterns.currentStreak}-Day Streak Going`,
            description: `You're ${patterns.streakRecord - patterns.currentStreak} days away from your record!`,
            data: { currentStreak: patterns.currentStreak, streakRecord: patterns.streakRecord }
          });
        }
      }
      
      // 3. Optimal study time recommendation
      if (patterns?.peakPerformanceDay && patterns?.peakPerformanceHour !== null) {
        recommendations.push({
          type: 'timing',
          priority: 'low',
          icon: '⏰',
          title: 'Optimal Study Time',
          description: `You perform best on ${patterns.peakPerformanceDay}s around ${patterns.peakPerformanceHour}:00. Schedule your learning then!`,
          data: { day: patterns.peakPerformanceDay, hour: patterns.peakPerformanceHour }
        });
      }
      
      // 4. Learning style recommendation
      if (analytics.learningStyle?.primary) {
        const style = this._formatLearningStyle(analytics.learningStyle);
        recommendations.push({
          type: 'style',
          priority: 'low',
          icon: style.icon,
          title: `You're a ${style.name} Learner`,
          description: style.description,
          data: { primary: analytics.learningStyle.primary, confidence: analytics.learningStyle.confidence }
        });
      }
      
      // 5. Persistence encouragement
      const persistence = analytics.persistenceMetrics;
      if (persistence?.retryAfterFailure >= 0.8) {
        recommendations.push({
          type: 'persistence',
          priority: 'low',
          icon: '💪',
          title: 'Great Persistence!',
          description: `You retry ${Math.round(persistence.retryAfterFailure * 100)}% of the time after getting something wrong. Keep it up!`,
          data: { retryRate: persistence.retryAfterFailure }
        });
      }
      
      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      
      console.log(`📊 AnalyticsService: Generated ${recommendations.length} recommendations for ${userId}`);
      
      return recommendations;
      
    } catch (error) {
      console.error(`📊 AnalyticsService: Error generating recommendations for ${userId}:`, error);
      return [];
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COMPARISONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Compare a user's metrics to average values
   * 
   * Compares the user against:
   * - 'course': Other users in the same course
   * - 'global': All users on the platform
   * 
   * @param {string} userId - Firebase Auth UID
   * @param {string} scope - Comparison scope: 'course' or 'global'
   * @param {string} [courseId] - Required if scope is 'course'
   * @returns {Promise<Object>} Comparison results
   * 
   * @example
   * const comparison = await AnalyticsService.compareToAverage('user123', 'global');
   * // Returns: { userScore: 75, avgScore: 68, difference: +7, percentile: 65 }
   */
  async compareToAverage(userId, scope, courseId = null) {
    if (!userId) {
      console.error('📊 AnalyticsService: userId is required');
      return null;
    }
    
    if (scope === 'course' && !courseId) {
      console.error('📊 AnalyticsService: courseId is required for course scope');
      return null;
    }
    
    console.log(`📊 AnalyticsService: Comparing ${userId} to ${scope} average`);
    
    try {
      // Get user's analytics
      const userAnalytics = await this.getUserAnalytics(userId);
      
      if (!userAnalytics || !userAnalytics.summaryStats) {
        return {
          hasData: false,
          message: 'Not enough data to compare'
        };
      }
      
      // Get averages (would come from aggregated collection in production)
      // For now, use reasonable defaults
      const averages = await this._getAverages(scope, courseId);
      
      const userScore = userAnalytics.summaryStats.averageScore || 0;
      const userAccuracy = userAnalytics.persistenceMetrics?.overallAccuracy || 0;
      const userStreak = userAnalytics.engagementPatterns?.currentStreak || 0;
      
      const comparison = {
        hasData: true,
        scope,
        user: {
          averageScore: Math.round(userScore * 100),
          overallAccuracy: Math.round(userAccuracy * 100),
          currentStreak: userStreak,
          activitiesCompleted: userAnalytics.summaryStats?.activitiesCompleted || 0
        },
        average: {
          averageScore: Math.round(averages.averageScore * 100),
          overallAccuracy: Math.round(averages.overallAccuracy * 100),
          currentStreak: averages.currentStreak,
          activitiesCompleted: averages.activitiesCompleted
        },
        difference: {
          averageScore: Math.round((userScore - averages.averageScore) * 100),
          overallAccuracy: Math.round((userAccuracy - averages.overallAccuracy) * 100),
          currentStreak: userStreak - averages.currentStreak
        },
        // Simplified percentile calculation
        percentile: await this.getPercentileRank(userId, 'averageScore', scope, courseId)
      };
      
      console.log(`📊 AnalyticsService: Comparison for ${userId}:`, comparison.difference);
      
      return comparison;
      
    } catch (error) {
      console.error(`📊 AnalyticsService: Error comparing ${userId}:`, error);
      return null;
    }
  },
  
  /**
   * Calculate a user's percentile rank for a given metric
   * 
   * @param {string} userId - Firebase Auth UID
   * @param {string} metric - Metric to rank: 'averageScore', 'streak', 'activitiesCompleted'
   * @param {string} [scope='global'] - Ranking scope
   * @param {string} [courseId] - Required if scope is 'course'
   * @returns {Promise<number>} Percentile rank (0-100)
   * 
   * @example
   * const percentile = await AnalyticsService.getPercentileRank('user123', 'averageScore');
   * // Returns: 75 (user is in the 75th percentile)
   */
  async getPercentileRank(userId, metric, scope = 'global', courseId = null) {
    if (!userId || !metric) {
      console.error('📊 AnalyticsService: userId and metric are required');
      return 0;
    }
    
    console.log(`📊 AnalyticsService: Calculating ${metric} percentile for ${userId}`);
    
    try {
      const userAnalytics = await this.getUserAnalytics(userId);
      
      if (!userAnalytics) {
        return 0;
      }
      
      // Get user's value for the metric
      const userValue = this._getMetricValue(userAnalytics, metric);
      
      if (userValue === null) {
        return 0;
      }
      
      // In a production system, this would query a pre-computed distribution
      // or sample from the userAnalytics collection
      // For now, estimate based on reasonable distributions
      const percentile = this._estimatePercentile(metric, userValue);
      
      console.log(`📊 AnalyticsService: ${userId} is in ${percentile}th percentile for ${metric}`);
      
      return percentile;
      
    } catch (error) {
      console.error(`📊 AnalyticsService: Error calculating percentile for ${userId}:`, error);
      return 0;
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Format learning style for display
   * @private
   */
  _formatLearningStyle(learningStyle) {
    if (!learningStyle || !learningStyle.primary) {
      return {
        name: 'Unknown',
        icon: '❓',
        description: 'Complete more activities to determine your learning style',
        confidence: 0
      };
    }
    
    const styles = {
      visual: {
        name: 'Visual',
        icon: '👁️',
        description: 'You learn best through diagrams, charts, and visual representations'
      },
      auditory: {
        name: 'Auditory',
        icon: '👂',
        description: 'You learn best through listening, discussions, and verbal explanations'
      },
      kinesthetic: {
        name: 'Kinesthetic',
        icon: '✋',
        description: 'You learn best through hands-on practice and interactive activities'
      },
      reading: {
        name: 'Reading/Writing',
        icon: '📖',
        description: 'You learn best through reading text and writing notes'
      }
    };
    
    const style = styles[learningStyle.primary] || styles.reading;
    
    return {
      ...style,
      confidence: learningStyle.confidence || 0,
      secondary: learningStyle.secondary ? styles[learningStyle.secondary]?.name : null,
      dataPoints: learningStyle.dataPoints || 0
    };
  },
  
  /**
   * Extract engagement pattern highlights
   * @private
   */
  _extractEngagementHighlights(patterns) {
    if (!patterns) {
      return [];
    }
    
    const highlights = [];
    
    if (patterns.currentStreak > 0) {
      highlights.push({
        type: 'streak',
        icon: '🔥',
        label: `${patterns.currentStreak} day streak`
      });
    }
    
    if (patterns.consistencyScore >= 0.7) {
      highlights.push({
        type: 'consistency',
        icon: '📅',
        label: 'Very consistent'
      });
    } else if (patterns.consistencyScore >= 0.4) {
      highlights.push({
        type: 'consistency',
        icon: '📅',
        label: 'Moderately consistent'
      });
    }
    
    if (patterns.peakPerformanceDay) {
      highlights.push({
        type: 'peak',
        icon: '⭐',
        label: `Best on ${patterns.peakPerformanceDay}s`
      });
    }
    
    return highlights;
  },
  
  /**
   * Calculate overall health indicators
   * @private
   */
  _calculateHealthIndicators(analytics) {
    const indicators = {
      overall: 'unknown',
      engagement: 'unknown',
      mastery: 'unknown',
      persistence: 'unknown'
    };
    
    if (!analytics.dataQuality?.hasEnoughData) {
      return indicators;
    }
    
    // Engagement health
    const consistency = analytics.engagementPatterns?.consistencyScore || 0;
    if (consistency >= 0.7) indicators.engagement = 'excellent';
    else if (consistency >= 0.4) indicators.engagement = 'good';
    else if (consistency >= 0.2) indicators.engagement = 'fair';
    else indicators.engagement = 'needs-work';
    
    // Mastery health
    const accuracy = analytics.persistenceMetrics?.overallAccuracy || 0;
    if (accuracy >= 0.8) indicators.mastery = 'excellent';
    else if (accuracy >= 0.6) indicators.mastery = 'good';
    else if (accuracy >= 0.4) indicators.mastery = 'fair';
    else indicators.mastery = 'needs-work';
    
    // Persistence health
    const retryRate = analytics.persistenceMetrics?.retryAfterFailure || 0;
    if (retryRate >= 0.8) indicators.persistence = 'excellent';
    else if (retryRate >= 0.6) indicators.persistence = 'good';
    else if (retryRate >= 0.4) indicators.persistence = 'fair';
    else indicators.persistence = 'needs-work';
    
    // Overall health
    const healthMap = { 'excellent': 4, 'good': 3, 'fair': 2, 'needs-work': 1, 'unknown': 0 };
    const avg = (healthMap[indicators.engagement] + healthMap[indicators.mastery] + healthMap[indicators.persistence]) / 3;
    
    if (avg >= 3.5) indicators.overall = 'excellent';
    else if (avg >= 2.5) indicators.overall = 'good';
    else if (avg >= 1.5) indicators.overall = 'fair';
    else indicators.overall = 'needs-work';
    
    return indicators;
  },
  
  /**
   * Get empty insights object
   * @private
   */
  _getEmptyInsights() {
    return {
      hasData: false,
      dataQuality: { hasEnoughData: false, activityCount: 0 },
      learningStyle: null,
      learningStyleFormatted: this._formatLearningStyle(null),
      strengthAreas: [],
      growthAreas: [],
      engagementPatterns: null,
      engagementHighlights: [],
      persistenceMetrics: null,
      summaryStats: null,
      healthIndicators: {
        overall: 'unknown',
        engagement: 'unknown',
        mastery: 'unknown',
        persistence: 'unknown'
      }
    };
  },
  
  /**
   * Format topic name for display
   * @private
   */
  _formatTopicName(topic) {
    if (!topic) return 'Unknown';
    return topic
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  },
  
  /**
   * Get averages for comparison
   * In production, would fetch from aggregated collection
   * @private
   */
  async _getAverages(scope, courseId) {
    // TODO: Fetch from courseAnalytics or platform-wide aggregates
    // For now, return reasonable baseline values
    return {
      averageScore: 0.65,
      overallAccuracy: 0.70,
      currentStreak: 3,
      activitiesCompleted: 25
    };
  },
  
  /**
   * Extract metric value from analytics
   * @private
   */
  _getMetricValue(analytics, metric) {
    switch (metric) {
      case 'averageScore':
        return analytics.summaryStats?.averageScore || null;
      case 'streak':
      case 'currentStreak':
        return analytics.engagementPatterns?.currentStreak || null;
      case 'activitiesCompleted':
        return analytics.summaryStats?.activitiesCompleted || null;
      case 'overallAccuracy':
        return analytics.persistenceMetrics?.overallAccuracy || null;
      case 'consistencyScore':
        return analytics.engagementPatterns?.consistencyScore || null;
      default:
        return null;
    }
  },
  
  /**
   * Estimate percentile based on typical distributions
   * @private
   */
  _estimatePercentile(metric, value) {
    // Simplified percentile estimation
    // In production, would use actual distribution data
    
    const distributions = {
      averageScore: { mean: 0.65, stddev: 0.15 },
      overallAccuracy: { mean: 0.70, stddev: 0.15 },
      currentStreak: { mean: 3, stddev: 5 },
      activitiesCompleted: { mean: 25, stddev: 30 },
      consistencyScore: { mean: 0.5, stddev: 0.2 }
    };
    
    const dist = distributions[metric] || { mean: 0.5, stddev: 0.2 };
    
    // Z-score
    const z = (value - dist.mean) / dist.stddev;
    
    // Convert to percentile (simplified normal CDF approximation)
    const percentile = Math.round(50 * (1 + this._erf(z / Math.sqrt(2))));
    
    return Math.max(1, Math.min(99, percentile));
  },
  
  /**
   * Error function approximation for percentile calculation
   * @private
   */
  _erf(x) {
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
  }
};

// Export for global access
window.AnalyticsServiceV2 = AnalyticsService;

// ═══════════════════════════════════════════════════════════════════════════
// MANUAL TESTING
// Uncomment and run in browser console to test
// ═══════════════════════════════════════════════════════════════════════════

// Test getUserAnalytics:
// AnalyticsServiceV2.getUserAnalytics('bLDCOI8o0dbwLyX5eOYHaNQMmyq1').then(console.log);

// Test getLearningInsights:
// AnalyticsServiceV2.getLearningInsights('bLDCOI8o0dbwLyX5eOYHaNQMmyq1').then(console.log);

// Test getRecommendations:
// AnalyticsServiceV2.getRecommendations('bLDCOI8o0dbwLyX5eOYHaNQMmyq1').then(console.log);

// Test compareToAverage:
// AnalyticsServiceV2.compareToAverage('bLDCOI8o0dbwLyX5eOYHaNQMmyq1', 'global').then(console.log);

// Test getPercentileRank:
// AnalyticsServiceV2.getPercentileRank('bLDCOI8o0dbwLyX5eOYHaNQMmyq1', 'averageScore').then(console.log);

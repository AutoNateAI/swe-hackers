/**
 * Diagram elements for Chapter 1: The Stone Remembers
 * 
 * These Cytoscape.js elements define the nodes and edges for each
 * interactive story diagram in this lesson.
 */

const diagramElements = {
  // Variables Story - Memory metaphor to variables as boxes
  'variables': [
    // Nodes - The core concepts
    { 
      data: { 
        id: 'brain', 
        label: '🧠 Your Brain', 
        type: 'concept',
        description: 'Your brain stores memories - names, facts, experiences'
      } 
    },
    { 
      data: { 
        id: 'computer', 
        label: '💻 Computer', 
        type: 'external',
        description: 'Computers need memory too - they use variables'
      } 
    },
    { 
      data: { 
        id: 'variable', 
        label: '📦 Variable', 
        type: 'concept',
        description: 'A labeled box that stores data'
      } 
    },
    
    // Example variables
    { 
      data: { 
        id: 'player-name', 
        label: 'player_name\n"Alex"', 
        type: 'data',
        description: 'String variable storing text'
      } 
    },
    { 
      data: { 
        id: 'score', 
        label: 'score\n0', 
        type: 'data',
        description: 'Integer variable storing a number'
      } 
    },
    { 
      data: { 
        id: 'is-playing', 
        label: 'is_playing\nTrue', 
        type: 'data',
        description: 'Boolean variable storing True/False'
      } 
    },
    
    // Usage
    { 
      data: { 
        id: 'use-variable', 
        label: '✨ Use in Code', 
        type: 'service',
        description: 'Reference the variable name to get its value'
      } 
    },

    // Edges - Connections between concepts
    { data: { source: 'brain', target: 'computer' } },
    { data: { source: 'computer', target: 'variable' } },
    { data: { source: 'variable', target: 'player-name' } },
    { data: { source: 'variable', target: 'score' } },
    { data: { source: 'variable', target: 'is-playing' } },
    { data: { source: 'player-name', target: 'use-variable' } },
    { data: { source: 'score', target: 'use-variable' } },
    { data: { source: 'is-playing', target: 'use-variable' } }
  ]
};

// Export for use by lesson-story.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = diagramElements;
} else if (typeof window !== 'undefined') {
  window.diagramElements = diagramElements;
}

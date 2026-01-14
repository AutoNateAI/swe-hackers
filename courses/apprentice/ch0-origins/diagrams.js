// Diagram elements for Chapter 0: The Origins
// Course: Apprentice

const diagramElements = {
  
  // Story 1: The Three Ancient Forces
  'three-forces': [
    // Central problem
    { 
      data: { 
        id: 'ancient-problem', 
        label: '🤔 The Problem', 
        type: 'external',
        description: 'How do we calculate things faster?'
      } 
    },
    
    // The three forces
    { 
      data: { 
        id: 'stone-silicon', 
        label: '🪨 Stone\n(Silicon)', 
        type: 'concept',
        description: 'From abacus to silicon chips - the foundation'
      } 
    },
    { 
      data: { 
        id: 'lightning-electricity', 
        label: '⚡ Lightning\n(Electricity)', 
        type: 'auth',
        description: 'The power source that brings machines to life'
      } 
    },
    { 
      data: { 
        id: 'magnetism-memory', 
        label: '🧲 Magnetism\n(Memory)', 
        type: 'data',
        description: 'North or south, on or off - digital storage'
      } 
    },
    
    // The breakthrough
    { 
      data: { 
        id: 'transistor', 
        label: '🔬 Transistor\n(1947)', 
        type: 'service',
        description: 'Tiny silicon switch - billions per chip'
      } 
    },
    
    // Modern result
    { 
      data: { 
        id: 'modern-computing', 
        label: '📱 Modern\nComputing', 
        type: 'page',
        description: '15 billion transistors in your pocket'
      } 
    },

    // Edges
    { data: { source: 'ancient-problem', target: 'stone-silicon' } },
    { data: { source: 'ancient-problem', target: 'lightning-electricity' } },
    { data: { source: 'ancient-problem', target: 'magnetism-memory' } },
    { data: { source: 'stone-silicon', target: 'transistor' } },
    { data: { source: 'lightning-electricity', target: 'transistor' } },
    { data: { source: 'transistor', target: 'modern-computing' } },
    { data: { source: 'magnetism-memory', target: 'modern-computing' } }
  ],

  // Story 2: Binary Language
  'binary': [
    // The switch
    { 
      data: { 
        id: 'switch', 
        label: '💡 Switch\nON / OFF', 
        type: 'external',
        description: 'A transistor is just a tiny switch'
      } 
    },
    
    // Binary concept
    { 
      data: { 
        id: 'binary-intro', 
        label: '0️⃣ Binary\n0 and 1', 
        type: 'concept',
        description: 'ON = 1, OFF = 0 - two symbols only'
      } 
    },
    
    // Positions
    { 
      data: { 
        id: 'positions', 
        label: '📊 Positions\n8 4 2 1', 
        type: 'data',
        description: 'Each position is a power of 2'
      } 
    },
    
    // Conversion
    { 
      data: { 
        id: 'conversion', 
        label: '🔄 Convert\n1010 = 10', 
        type: 'service',
        description: 'Add up positions with 1s'
      } 
    },
    
    // Everything
    { 
      data: { 
        id: 'everything-binary', 
        label: '🌐 Everything\nis Binary', 
        type: 'page',
        description: 'Text, images, music - all 0s and 1s'
      } 
    },

    // Edges
    { data: { source: 'switch', target: 'binary-intro' } },
    { data: { source: 'binary-intro', target: 'positions' } },
    { data: { source: 'positions', target: 'conversion' } },
    { data: { source: 'conversion', target: 'everything-binary' } }
  ],

  // Story 3: Navigating Your Computer
  'navigation': [
    // Library analogy
    { 
      data: { 
        id: 'library', 
        label: '📚 Library\nProblem', 
        type: 'external',
        description: 'Millions of files need organization'
      } 
    },
    
    // Folders
    { 
      data: { 
        id: 'folders', 
        label: '📁 Folders\n& Files', 
        type: 'concept',
        description: 'Tree-like structure organizes everything'
      } 
    },
    
    // Paths
    { 
      data: { 
        id: 'paths', 
        label: '🛤️ Paths\n/Users/You', 
        type: 'data',
        description: 'Every file has an address'
      } 
    },
    
    // Terminal
    { 
      data: { 
        id: 'terminal', 
        label: '🖥️ Terminal\n$ _', 
        type: 'service',
        description: 'Text interface to control your computer'
      } 
    },
    
    // Commands
    { 
      data: { 
        id: 'commands', 
        label: '⌨️ Commands\npwd ls cd', 
        type: 'auth',
        description: 'Essential navigation commands'
      } 
    },

    // Edges
    { data: { source: 'library', target: 'folders' } },
    { data: { source: 'folders', target: 'paths' } },
    { data: { source: 'paths', target: 'terminal' } },
    { data: { source: 'terminal', target: 'commands' } }
  ]
};

// Export for use in lesson
if (typeof module !== 'undefined') {
  module.exports = diagramElements;
} else {
  window.diagramElements = diagramElements;
}

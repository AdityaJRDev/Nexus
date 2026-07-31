import React, { useState, useRef, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import useStore, { socket } from '../store/useStore';
import { GripHorizontal, Send } from 'lucide-react';

import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';

const Tile = ({ id, x, y, width, height, title, type }) => {
  const updateTilePosition = useStore((state) => state.updateTilePosition);
  const messages = useStore((state) => state.messages);
  const addMessage = useStore((state) => state.addMessage);

  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef(null);
  const terminalRef = useRef(null);

  // useSpring handles the position of the tile
  const [{ x: springX, y: springY }, api] = useSpring(() => ({
    x,
    y,
    config: { tension: 350, friction: 30 },
  }));

  // Sync with store if it gets updated remotely
  useEffect(() => {
    api.start({ x, y });
  }, [x, y, api]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (type === 'chat' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, type]);

  // Initialize Terminal
  useEffect(() => {
    if (type === 'terminal' && terminalRef.current) {
      const term = new Terminal({
        theme: {
          background: '#0a0a0a',
          foreground: '#4ade80', // green-400
          cursor: '#4ade80'
        },
        fontFamily: 'monospace',
        fontSize: 14
      });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      
      // Buffer to hold commands locally until Enter is pressed
      let currentCommand = '';

      // Auto-Copy on Selection
      term.onSelectionChange(() => {
        const selection = term.getSelection();
        if (selection) {
          navigator.clipboard.writeText(selection);
        }
      });

      // Keyboard Paste (Ctrl+V / Cmd+V)
      term.attachCustomKeyEventHandler((arg) => {
        if (arg.type === 'keydown' && arg.code === 'KeyV' && (arg.ctrlKey || arg.metaKey)) {
          navigator.clipboard.readText().then((text) => {
            currentCommand += text;
            term.write(text);
          }).catch(err => console.error('Clipboard read failed', err));
          return false;
        }
        return true;
      });

      // Wait a tick for the container to render properly before fitting
      setTimeout(() => fitAddon.fit(), 50);

      // Handle terminal keystrokes -> Backend
      const onDataDisposable = term.onData((data) => {
        if (data === '\r') {
          // On Enter: send the clean command with a newline, then reset buffer
          socket.emit('terminal-command', { command: currentCommand + '\n' });
          term.write('\r\n');
          currentCommand = '';
        } else if (data === '\u007F') {
          // On Backspace: remove last char from buffer and erase visually
          if (currentCommand.length > 0) {
            currentCommand = currentCommand.slice(0, -1);
            term.write('\b \b');
          }
        } else if (data.startsWith('\x1b')) {
          // Ignore arrow keys and other ANSI escapes to prevent garbage text
          return;
        } else {
          // Normal typing: add to buffer and echo visually
          currentCommand += data;
          term.write(data);
        }
      });

      // Handle Backend -> terminal output
      const handleOutput = (data) => {
        term.write(data);
      };
      socket.on('terminal-output', handleOutput);

      // Handle resizing properly if the tile size changes
      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
      });
      resizeObserver.observe(terminalRef.current);

      return () => {
        onDataDisposable.dispose();
        socket.off('terminal-output', handleOutput);
        resizeObserver.disconnect();
        term.dispose();
      };
    }
  }, [type]);

  // Bind the drag gesture to the header
  const bind = useDrag(
    ({ event, offset: [ox, oy] }) => {
      event.stopPropagation();
      api.start({ x: ox, y: oy });
      // Emit to socket via store
      updateTilePosition(id, ox, oy);
    },
    {
      from: () => [springX.get(), springY.get()],
    }
  );

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    addMessage({ text: chatInput.trim(), sender: 'Me' }, true);
    setChatInput('');
  };

  return (
    <animated.div
      style={{
        x: springX,
        y: springY,
        width,
        height,
      }}
      className="absolute flex flex-col bg-neutral-800 border border-neutral-700 rounded-xl shadow-xl overflow-hidden text-neutral-200 pointer-events-auto"
    >
      {/* Header / Drag Handle */}
      <div
        {...bind()}
        className="h-10 bg-neutral-900 border-b border-neutral-700 flex items-center px-4 cursor-grab active:cursor-grabbing shrink-0 select-none"
      >
        <GripHorizontal size={16} className="text-neutral-500 mr-2" />
        <span className="text-sm font-medium">{title}</span>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-neutral-800 relative">
        {type === 'terminal' ? (
          <div className="flex-1 p-2 w-full h-full bg-[#0a0a0a]" onPointerDown={(e) => e.stopPropagation()}>
            {/* The terminal canvas will attach to this div */}
            <div ref={terminalRef} className="w-full h-full" />
          </div>
        ) : type === 'chat' ? (
          <div className="flex flex-col h-full w-full">
            {/* Messages List */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((msg, idx) => (
                <div key={msg.id || idx} className="text-sm">
                  <span className="font-semibold text-blue-400 mr-2">{msg.sender}:</span>
                  <span className="text-neutral-300">{msg.text}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input Form */}
            <form onSubmit={handleChatSubmit} className="p-3 bg-neutral-900 border-t border-neutral-700 flex gap-2 shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                onPointerDown={(e) => e.stopPropagation()} // Prevent dragging when clicking input
              />
              <button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded transition-colors flex items-center justify-center w-8 h-8"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </animated.div>
  );
};

export default Tile;

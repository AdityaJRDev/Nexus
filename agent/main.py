import socketio
import time

# Initialize Socket.io Client
sio = socketio.Client()

@sio.event
def connect():
    print("Python Agent: Connected to Nexus Hub")
    sio.emit('join-workspace')

@sio.event
def connect_error(data):
    print("Python Agent: Connection failed", data)

@sio.event
def disconnect():
    print("Python Agent: Disconnected from Nexus Hub")

@sio.on('chat-message')
def on_chat_message(data):
    sender = data.get('sender', '')
    text = data.get('text', '')
    
    # Prevent infinite loop if the agent itself sent the message
    if sender == 'Agent':
        return
        
    # Check if the message mentions the agent
    if '@agent' in text.lower():
        print(f"Agent triggered by message: {text}")
        
        # Simulate processing time
        time.sleep(1)
        
        # Determine response logic
        response_text = "I am on it! Processing your request..."
        
        # Parse command dynamically
        lower_text = text.lower()
        agent_idx = lower_text.find('@agent ')
        
        if agent_idx != -1:
            # Extract everything after '@agent '
            command_start = agent_idx + len('@agent ')
            command_to_run = text[command_start:].strip()
            
            if command_to_run:
                print(f"Executing '{command_to_run}' command in terminal...")
                payload = {
                    'command': command_to_run + '\n'
                }
                sio.emit('terminal-command', payload)
                response_text = f'Executing: {command_to_run}'
        # Send acknowledgement back to chat
        sio.emit('chat-message', {
            'id': f'agent-{int(time.time())}',
            'text': response_text,
            'sender': 'Agent'
        })

if __name__ == '__main__':
    try:
        sio.connect('http://localhost:5000')
        sio.wait()
    except Exception as e:
        print(f"Agent failed to start: {e}")

# 🎓 Student Voice Assistant - User Guide

## Overview
This is an AI-powered voice assistant designed specifically for students. It allows you to:
- **Speak your questions** using voice input
- **See your transcript** before sending
- **Get responses** in both text and speech
- **Chat history** to review past conversations

## Features

### 🎤 Voice Recording
- Click "Start Recording" to begin speaking
- Your speech is transcribed in real-time
- Click "Stop Recording" when finished

### 📝 Transcript Display
- See exactly what you said before sending
- Edit or re-record if needed
- Click "Send Message" to submit

### 💬 Chat Interface
- View conversation history
- See both your questions and AI responses
- Responses include both text and audio playback

### 🔊 Audio Responses
- The AI speaks responses back to you
- Perfect for hands-free learning
- Great for auditory learners

## Getting Started

### Step 1: Get Your OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-proj-...`)

### Step 2: Start the Application
```bash
npm run dev
```

### Step 3: Connect
1. Open your browser to `http://localhost:3000`
2. Enter your OpenAI API key
3. Click "Connect"
4. Grant microphone permissions when prompted

### Step 4: Start Talking!
1. Click "Start Recording"
2. Speak your question or message
3. Click "Stop Recording"
4. Review your transcript
5. Click "Send Message"
6. Listen to the AI's response

## Use Cases for Students

### 📚 Study Help
- "Explain photosynthesis in simple terms"
- "Help me understand quadratic equations"
- "What are the causes of World War I?"

### 📖 Homework Assistance
- "How do I solve this math problem?"
- "Help me write an essay about climate change"
- "Explain the scientific method"

### 🧠 Concept Clarification
- "What's the difference between mitosis and meiosis?"
- "Can you explain Newton's laws of motion?"
- "What is the water cycle?"

### 📝 Writing Help
- "Help me write a thesis statement about..."
- "Check my grammar and suggest improvements"
- "How do I structure a persuasive essay?"

### 🌍 Language Learning
- "How do you say 'hello' in Spanish?"
- "Explain French grammar rules"
- "Help me practice pronunciation"

## Tips for Best Results

1. **Speak Clearly**: Enunciate your words for better transcription
2. **Quiet Environment**: Reduce background noise
3. **Be Specific**: Ask detailed questions for better answers
4. **Review Transcript**: Check your message before sending
5. **Use Follow-ups**: Ask clarifying questions if needed

## Privacy & Security

- Your API key is used only to generate a secure ephemeral token
- Your API key is never stored on our servers
- All conversations happen directly with OpenAI's API
- You can disconnect anytime to end the session

## Troubleshooting

### Microphone Not Working
- Check browser permissions
- Try a different browser (Chrome recommended)
- Check your system microphone settings

### Connection Issues
- Verify your API key is correct
- Check your internet connection
- Ensure you have API credits available

### Poor Transcription
- Speak more clearly
- Reduce background noise
- Move closer to your microphone
- Check microphone quality

## Technical Details

- **Framework**: Next.js 15 with React 19
- **Voice SDK**: OpenAI Agents SDK
- **Model**: GPT-4 Realtime
- **Transport**: WebRTC for browser communication

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review OpenAI's documentation
3. Check your API key permissions
4. Ensure you have sufficient API credits

## Future Enhancements

Planned features:
- [ ] Multiple language support
- [ ] Voice speed adjustment
- [ ] Conversation export
- [ ] Study session tracking
- [ ] Flashcard generation
- [ ] Practice quiz creation

---

**Happy Learning! 🎓**


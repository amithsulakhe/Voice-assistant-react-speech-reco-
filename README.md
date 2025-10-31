# 🎓 Student Voice Assistant

An AI-powered voice assistant built with Next.js and OpenAI's Realtime API, designed specifically for students to help with learning, homework, and studying.

## ✨ Features

- 🎤 **Voice Input**: Speak your questions naturally
- 📝 **Real-time Transcription**: See your words as you speak
- 💬 **Chat Interface**: View conversation history
- 🔊 **Audio Responses**: Listen to AI responses
- 🎯 **Student-Focused**: Optimized for educational queries
- 🔒 **Secure**: Your API key is never stored

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- OpenAI API key ([Get one here](https://platform.openai.com/))
- Modern web browser (Chrome recommended)

### Installation

1. **Clone or navigate to the project**
```bash
cd my-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
npm run dev
```

4. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 How to Use

### First Time Setup

1. **Enter Your API Key**
   - Get your OpenAI API key from [platform.openai.com](https://platform.openai.com/)
   - Paste it in the input field
   - Click "Connect"

2. **Grant Microphone Permission**
   - Your browser will ask for microphone access
   - Click "Allow" to enable voice recording

### Using the Assistant

1. **Start Recording**
   - Click the "Start Recording" button
   - Speak your question clearly
   - Example: "Explain photosynthesis in simple terms"

2. **Stop Recording**
   - Click "Stop Recording" when finished
   - Review your transcript

3. **Send Message**
   - Click "Send Message" to submit
   - The AI will respond with both text and audio

4. **Continue Conversation**
   - Ask follow-up questions
   - View your chat history
   - Learn at your own pace

## 🎯 Use Cases

### Study Help
- "Explain the water cycle"
- "Help me understand quadratic equations"
- "What are the causes of World War II?"

### Homework Assistance
- "How do I solve this math problem?"
- "Help me write an essay about climate change"
- "Check my grammar"

### Concept Clarification
- "What's the difference between mitosis and meiosis?"
- "Explain Newton's laws of motion"
- "How does DNA replication work?"

### Language Learning
- "How do you say 'hello' in Spanish?"
- "Explain French grammar rules"
- "Help me practice pronunciation"

## 🛠️ Technology Stack

- **Framework**: Next.js 15
- **UI**: React 19
- **Styling**: Tailwind CSS 4
- **Voice SDK**: OpenAI Agents SDK
- **Model**: GPT-4 Realtime
- **Transport**: WebRTC

## 📁 Project Structure

```
my-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── get-token/      # API route for ephemeral tokens
│   │   ├── components/
│   │   │   └── VoiceAssistant.tsx  # Main voice assistant component
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   └── globals.css         # Global styles
│   └── ...
├── public/                     # Static assets
├── package.json
└── README.md
```

## 🔧 Configuration

### Environment Variables (Optional)

You can create a `.env.local` file for development:

```env
OPENAI_API_KEY=your_api_key_here
```

However, the app is designed to work without storing the API key, as users enter it directly in the UI.

## 🔒 Security & Privacy

- ✅ API keys are used only to generate ephemeral tokens
- ✅ No API keys are stored on the server
- ✅ All communication happens directly with OpenAI
- ✅ Sessions can be disconnected anytime
- ✅ No conversation history is stored

## 🐛 Troubleshooting

### Microphone Not Working
- Check browser permissions
- Try Chrome (best compatibility)
- Check system microphone settings
- Ensure microphone is not muted

### Connection Issues
- Verify your API key is correct
- Check your internet connection
- Ensure you have OpenAI API credits
- Try refreshing the page

### Poor Transcription
- Speak clearly and slowly
- Reduce background noise
- Move closer to your microphone
- Check microphone quality

### Audio Not Playing
- Check your browser's audio permissions
- Ensure your speakers/headphones are connected
- Check system volume settings
- Try a different browser

## 📚 Documentation

For more detailed information, see:
- [Voice Assistant User Guide](./VOICE_ASSISTANT_GUIDE.md)
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-js/)
- [Next.js Documentation](https://nextjs.org/docs)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Built with [OpenAI's Realtime API](https://platform.openai.com/docs/guides/realtime)
- Powered by [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)

## 💡 Tips for Best Results

1. **Speak Clearly**: Enunciate your words
2. **Quiet Environment**: Reduce background noise
3. **Be Specific**: Ask detailed questions
4. **Review Transcript**: Check before sending
5. **Use Follow-ups**: Ask clarifying questions
6. **Take Breaks**: Don't overuse the assistant
7. **Practice**: The more you use it, the better it works

## 🚀 Future Enhancements

- [ ] Multiple language support
- [ ] Voice speed adjustment
- [ ] Conversation export
- [ ] Study session tracking
- [ ] Flashcard generation
- [ ] Practice quiz creation
- [ ] Voice customization
- [ ] Multi-user support

---

**Built with ❤️ for students everywhere**

Happy Learning! 🎓

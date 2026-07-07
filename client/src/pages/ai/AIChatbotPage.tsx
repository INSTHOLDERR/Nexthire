import Navbar from '../../components/common/Navbar';

export default function AIChatbotPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-4xl mb-4">🤖</p>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">AI Chatbot</h1>
        <p className="text-slate-500">AI-powered career assistant is coming soon.</p>
      </main>
    </div>
  );
}

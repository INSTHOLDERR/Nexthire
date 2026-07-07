import Navbar from '../../components/common/Navbar';
import { useAuth } from '../../hooks/useAuth';

const ROLE_CONFIG = {
  jobseeker: {
    title:    'AI Mock Interview',
    subtitle: 'Practice interviews with our AI interviewer, get real-time feedback, and build confidence before your actual interview.',
    cta:      'Start Practice Session',
    color:    'from-blue-500 to-indigo-600',
    icon:     '🎯',
  },
  recruiter: {
    title:    'AI Candidate Screening',
    subtitle: 'Use AI-powered screening sessions to shortlist candidates faster and more accurately.',
    cta:      'Create Screening Session',
    color:    'from-purple-500 to-purple-700',
    icon:     '🤖',
  },
} as const;

const INTERVIEW_TYPES = [
  { icon: '💻', label: 'Technical',       desc: 'DSA, system design, coding problems'    },
  { icon: '🧠', label: 'Behavioural',     desc: 'STAR method, soft skills, culture fit'  },
  { icon: '📦', label: 'Product',         desc: 'Product sense, metrics, prioritisation' },
  { icon: '🎨', label: 'Design',          desc: 'UI/UX process, case studies, critique'  },
];

const PAST_SESSIONS = [
  { title: 'Frontend Engineer – Technical', score: 82, date: '2 days ago',  feedback: 'Strong in React patterns, improve system design depth.' },
  { title: 'Product Manager – Behavioural', score: 76, date: '5 days ago',  feedback: 'Good STAR structure, add more quantified outcomes.'      },
  { title: 'Software Engineer – Coding',    score: 91, date: '1 week ago',  feedback: 'Excellent problem-solving speed and code clarity.'       },
];

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 85 ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : score >= 70            ? 'text-amber-700  bg-amber-50  border-amber-200'
    :                          'text-red-700    bg-red-50    border-red-200';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${color}`}>
      {score}%
    </span>
  );
}

export default function AIInterviewPage() {
  const { user } = useAuth();
  const role   = user?.role ?? 'jobseeker';
  const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.jobseeker;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Hero */}
        <div className={`bg-gradient-to-br ${config.color} rounded-2xl p-6 sm:p-8 text-white shadow-lg`}>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{config.icon}</span>
            <div>
              <h1 className="text-2xl font-bold">{config.title}</h1>
              <p className="text-white/80 text-sm mt-1 max-w-xl">{config.subtitle}</p>
            </div>
          </div>
          <button className="px-6 py-2.5 bg-white text-slate-800 font-bold text-sm rounded-xl hover:bg-slate-100 transition-colors shadow">
            {config.cta}
          </button>
        </div>

        {/* Interview type selection */}
        <div>
          <h2 className="font-bold text-slate-800 mb-3">Choose interview type</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {INTERVIEW_TYPES.map(({ icon, label, desc }) => (
              <button
                key={label}
                className="bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <span className="text-2xl mb-2 block">{icon}</span>
                <p className="font-semibold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-4">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { step: '1', icon: '🎙️', title: 'Pick a role',     desc: 'Select the position and interview type you want to practise.' },
              { step: '2', icon: '💬', title: 'Answer questions', desc: 'Our AI asks real interview questions and adapts based on your answers.' },
              { step: '3', icon: '📊', title: 'Get feedback',     desc: 'Receive a score, strengths, and specific areas to improve.' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {step}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{icon} {title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Past sessions */}
        {role === 'jobseeker' && (
          <div>
            <h2 className="font-bold text-slate-800 mb-3">Your recent sessions</h2>
            <div className="space-y-3">
              {PAST_SESSIONS.map(session => (
                <div key={session.title} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 text-sm">{session.title}</p>
                      <ScoreBadge score={session.score} />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{session.date}</p>
                    <p className="text-xs text-slate-500 mt-1 italic">"{session.feedback}"</p>
                  </div>
                  <button className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                    Review
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coming soon footer */}
        <div className="text-center py-4 text-xs text-slate-400">
          Full AI-powered interview sessions with GPT-4 and real-time voice feedback coming soon.
        </div>

      </main>
    </div>
  );
}

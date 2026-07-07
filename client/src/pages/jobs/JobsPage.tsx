import Navbar from '../../components/common/Navbar';
import { useAuth } from '../../hooks/useAuth';

// Role-specific content: jobseekers see "Browse jobs", recruiters see "Post a job"
const ROLE_CONFIG = {
  jobseeker: {
    title:    'Find your next opportunity',
    subtitle: 'Browse thousands of jobs matched to your skills and goals.',
    cta:      'Browse Jobs',
    icon:     '🔍',
    color:    'from-blue-500 to-blue-600',
  },
  recruiter: {
    title:    'Find the perfect candidate',
    subtitle: 'Post jobs and discover top talent actively looking for work.',
    cta:      'Post a Job',
    icon:     '📢',
    color:    'from-purple-500 to-purple-600',
  },
} as const;

const SAMPLE_JOBS = [
  { id: '1', title: 'Senior Frontend Developer',  company: 'TechCorp India',    location: 'Bangalore · Remote',   salary: '₹18–28 LPA',  type: 'Full-time',  badge: 'bg-blue-50 text-blue-700',   posted: '2h ago'   },
  { id: '2', title: 'Product Manager',             company: 'Startup Hub',       location: 'Mumbai · Hybrid',       salary: '₹22–35 LPA',  type: 'Full-time',  badge: 'bg-purple-50 text-purple-700', posted: '5h ago'  },
  { id: '3', title: 'Backend Engineer (Node.js)',  company: 'Fintech Solutions', location: 'Hyderabad · On-site',   salary: '₹15–22 LPA',  type: 'Full-time',  badge: 'bg-blue-50 text-blue-700',   posted: '1d ago'   },
  { id: '4', title: 'UI/UX Designer',              company: 'Design Studio',     location: 'Pune · Remote',         salary: '₹10–16 LPA',  type: 'Contract',   badge: 'bg-amber-50 text-amber-700', posted: '1d ago'   },
  { id: '5', title: 'Data Scientist',              company: 'Analytics Co',      location: 'Chennai · Hybrid',      salary: '₹20–30 LPA',  type: 'Full-time',  badge: 'bg-blue-50 text-blue-700',   posted: '2d ago'   },
  { id: '6', title: 'DevOps Engineer',             company: 'CloudBase',         location: 'Delhi · Remote',        salary: '₹16–24 LPA',  type: 'Full-time',  badge: 'bg-blue-50 text-blue-700',   posted: '3d ago'   },
];

export default function JobsPage() {
  const { user } = useAuth();
  const role   = user?.role ?? 'jobseeker';
  const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.jobseeker;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Hero banner — changes based on role */}
        <div className={`bg-gradient-to-br ${config.color} rounded-2xl p-6 sm:p-8 text-white shadow-lg`}>
          <div className="flex items-center gap-4">
            <span className="text-5xl">{config.icon}</span>
            <div>
              <h1 className="text-2xl font-bold mb-1">{config.title}</h1>
              <p className="text-white/80 text-sm">{config.subtitle}</p>
            </div>
          </div>
          <button className="mt-5 px-6 py-2.5 bg-white text-slate-800 font-bold text-sm rounded-xl hover:bg-slate-100 transition-colors shadow">
            {config.cta}
          </button>
        </div>

        {/* Search + filters bar */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
            </svg>
            <input
              placeholder="Job title, company or keyword…"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <input
              placeholder="Location…"
              className="w-full sm:w-44 pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
          <select className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300">
            <option value="">All types</option>
            <option value="full-time">Full-time</option>
            <option value="contract">Contract</option>
            <option value="remote">Remote</option>
          </select>
          <button className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors">
            Search
          </button>
        </div>

        {/* Job listings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-600">{SAMPLE_JOBS.length} jobs found</p>
            <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none">
              <option>Most relevant</option>
              <option>Most recent</option>
              <option>Highest salary</option>
            </select>
          </div>

          {SAMPLE_JOBS.map(job => (
            <div
              key={job.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Company logo placeholder */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0 text-slate-500 font-bold text-sm">
                  {job.company[0]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-800 text-base group-hover:text-blue-600 transition-colors">{job.title}</h3>
                    <span className="text-xs text-slate-400 flex-shrink-0">{job.posted}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{job.company}</p>

                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      </svg>
                      {job.location}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${job.badge}`}>{job.type}</span>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{job.salary}</span>
                  </div>
                </div>

                <button className="flex-shrink-0 px-4 py-2 text-xs font-semibold border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all">
                  {role === 'recruiter' ? 'View' : 'Apply'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* "Coming soon" notice at bottom */}
        <div className="text-center py-6 text-xs text-slate-400">
          Full job board with real listings, applications, and recruiter tools is coming soon.
        </div>
      </main>
    </div>
  );
}

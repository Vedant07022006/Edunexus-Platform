import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getAllCourses, searchCourses } from '../services/api.service';
import CourseCard, { CourseCardSkeleton } from '../components/courses/CourseCard';
import { Search, Sparkles, BookOpen, Users, Zap, Star, ArrowRight, GraduationCap, Brain, Award } from 'lucide-react';
import Button from '../components/ui/Button';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

const stats = [
  { icon: BookOpen, label: 'Courses', value: '500+' },
  { icon: Users, label: 'Students', value: '50K+' },
  { icon: GraduationCap, label: 'Instructors', value: '200+' },
  { icon: Star, label: 'Avg Rating', value: '4.8' },
];

const features = [
  { icon: Brain, title: 'AI-Powered Quizzes', desc: 'Auto-generated quizzes from video transcripts using LLaMA AI.' },
  { icon: Zap, title: 'Auto Transcripts', desc: 'Every lecture gets a searchable AI transcript via AssemblyAI.' },
  { icon: Award, title: 'Track Progress', desc: 'Visual progress tracking across every lecture you complete.' },
];

export default function LandingPage() {
  const [courses, setCourses]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  useEffect(() => {
    getAllCourses({ limit: 6 })
      .then(({ data }) => setCourses(data.data.courses))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const { data } = await searchCourses(query.trim());
      setSearchResults(data.data.courses);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 glass border border-primary-500/30 text-primary-300 text-xs font-medium px-4 py-1.5 rounded-full mb-6">
              <Sparkles size={12} /> AI-Powered Learning Platform
            </span>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight text-slate-900 dark:text-white">
              Learn Without
              <span className="gradient-text block">Limits</span>
            </h1>

            <p className="mt-6 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Master in-demand skills with AI-curated courses, auto-generated quizzes, and real-time progress tracking.
              Built for the next generation of learners.
            </p>
          </motion.div>

          {/* Search */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            onSubmit={handleSearch}
            className="mt-10 flex gap-2 max-w-xl mx-auto"
          >
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={e => { setQuery(e.target.value); if (!e.target.value) setSearchResults(null); }}
                placeholder="Search any topic, skill, or course..."
                className="w-full glass border border-slate-900/10 dark:border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-primary-500 transition-all"
              />
            </div>
            <Button type="submit" size="lg" loading={searching}>
              Search
            </Button>
          </motion.form>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-3"
          >
            <Link to="/courses">
              <Button size="lg">Browse All Courses <ArrowRight size={16} /></Button>
            </Link>
            <Link to="/register">
              <Button variant="secondary" size="lg">Start Teaching</Button>
            </Link>
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass rounded-2xl p-6 text-center border border-slate-900/[0.06] dark:border-white/[0.06] card-hover">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center mx-auto mb-3">
                <Icon size={18} className="text-white" />
              </div>
              <p className="text-2xl font-bold gradient-text">{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Search Results */}
      {searchResults && (
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
            {searchResults.length > 0 ? `Found ${searchResults.length} results for "${query}"` : `No results for "${query}"`}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {searchResults.map((c, i) => <CourseCard key={c._id} course={c} index={i} />)}
          </div>
        </section>
      )}

      {/* Featured Courses */}
      {!searchResults && (
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-20">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Featured Courses</h2>
              <p className="text-sm text-slate-500 mt-1">Hand-picked courses to get you started</p>
            </div>
            <Link to="/courses" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {loading
              ? Array(6).fill(0).map((_, i) => <CourseCardSkeleton key={i} />)
              : courses.map((c, i) => <CourseCard key={c._id} course={c} index={i} />)
            }
          </div>
        </section>
      )}

      {/* Features */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Why EduNexus?</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-3">Everything you need to learn and grow</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="glass rounded-2xl p-6 border border-slate-900/[0.06] dark:border-white/[0.06] card-hover"
            >
              <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center mb-4">
                <Icon size={22} className="text-white" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-20">
        <div className="glass rounded-3xl p-10 text-center border border-primary-500/20 gradient-card relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-600/10 to-purple-600/10 pointer-events-none" />
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3 relative">Ready to start learning?</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6 relative">Join thousands of students already learning on EduNexus.</p>
          <Link to="/register">
            <Button size="xl" className="glow">
              Get Started for Free <ArrowRight size={18} />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

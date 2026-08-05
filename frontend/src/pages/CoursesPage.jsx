import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { getAllCourses, searchCourses, getCoursesByCategory } from '../services/api.service';
import CourseCard, { CourseCardSkeleton } from '../components/courses/CourseCard';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { Search, X } from 'lucide-react';

const CATEGORIES = ['All', 'Development', 'Design', 'Business', 'Marketing', 'Data Science', 'DevOps'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
];

export default function CoursesPage() {
  const [courses, setCourses]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [query, setQuery]             = useState('');
  const [sort, setSort]               = useState('newest');
  const [category, setCategory]       = useState('All');

  /**
   * "mode" drives what the current grid is displaying.
   * Storing it in a single object avoids the React batching issue where
   * multiple setState calls only flush after the next render, which caused
   * the old activeQuery to be stale inside fetchCourses's closure.
   */
  const [mode, setMode] = useState({
    type: 'all',   // 'all' | 'search' | 'category'
    value: '',     // search term or category name
    page: 1,
    sort: 'newest',
  });

  // ── Core fetch — reads everything from the "mode" snapshot ──────────────
  const doFetch = async (m) => {
    setLoading(true);
    try {
      let res;
      if (m.type === 'search' && m.value.trim()) {
        res = await searchCourses(m.value.trim());
        setCourses(res.data.data.courses || []);
        setTotal(res.data.data.total || 0);
      } else if (m.type === 'category' && m.value !== 'All') {
        res = await getCoursesByCategory(m.value);
        setCourses(res.data.data.courses || []);
        setTotal(res.data.data.total || 0);
      } else {
        res = await getAllCourses({ page: m.page, limit: 12, sort: m.sort });
        setCourses(res.data.data.courses || []);
        setTotal(res.data.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch whenever mode changes
  useEffect(() => {
    doFetch(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ── Handlers — update mode atomically so doFetch always gets fresh values ─
  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    const next = { type: 'search', value: trimmed, page: 1, sort };
    setMode(next);
    setPage(1);
    setCategory('All');
  };

  const clearSearch = () => {
    setQuery('');
    const next = { type: 'all', value: '', page: 1, sort };
    setMode(next);
    setPage(1);
  };

  const handleCategoryChange = (cat) => {
    setQuery('');
    setCategory(cat);
    setPage(1);
    const next = cat === 'All'
      ? { type: 'all', value: '', page: 1, sort }
      : { type: 'category', value: cat, page: 1, sort };
    setMode(next);
  };

  const handleSortChange = (newSort) => {
    setSort(newSort);
    setPage(1);
    setMode((prev) => ({ ...prev, sort: newSort, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    setMode((prev) => ({ ...prev, page: newPage }));
  };

  const isSearchMode   = mode.type === 'search';
  const activeQuery    = isSearchMode ? mode.value : '';
  const totalPages     = Math.ceil(total / 12);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">All Courses</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">
            {isSearchMode
              ? `${total} results for "${activeQuery}"`
              : `${total} courses available`}
          </p>
        </motion.div>

        {/* Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search courses, topics, skills..."
                className="w-full glass border border-slate-900/10 dark:border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-primary-500 transition-all"
              />
              {(query || isSearchMode) && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="gradient-primary text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Search
            </button>
          </form>

          <select
            value={sort}
            onChange={e => handleSortChange(e.target.value)}
            className="glass border border-slate-900/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary-500 bg-transparent cursor-pointer"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value} className="bg-surface-3">{o.label}</option>
            ))}
          </select>
        </div>

        {/* Category Pills — hide when in search mode */}
        {!isSearchMode && (
          <div className="flex gap-2 flex-wrap mb-8">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-4 py-1.5 text-sm rounded-full transition-all ${
                  category === cat
                    ? 'gradient-primary text-white glow-sm'
                    : 'glass border border-slate-900/10 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-900/15 dark:hover:border-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Active search chip */}
        {isSearchMode && (
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs text-slate-600 dark:text-slate-400">Showing results for:</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 glass border border-primary-500/30 text-primary-300 rounded-full text-xs">
              {activeQuery}
              <button onClick={clearSearch}><X size={11} /></button>
            </span>
          </div>
        )}

        {/* Course Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {loading
            ? Array(12).fill(0).map((_, i) => <CourseCardSkeleton key={i} />)
            : courses.length === 0
              ? (
                <div className="col-span-full text-center py-20">
                  <Search size={40} className="text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">No courses found</p>
                  <p className="text-slate-600 text-sm mt-1">
                    {isSearchMode ? `Try a different search term` : 'No courses in this category yet'}
                  </p>
                  {isSearchMode && (
                    <button
                      onClick={clearSearch}
                      className="mt-4 text-sm text-primary-400 hover:text-primary-300"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )
              : courses.map((c, i) => <CourseCard key={c._id} course={c} index={i} />)
          }
        </div>

        {/* Pagination — only for all/category modes */}
        {totalPages > 1 && !isSearchMode && (
          <div className="mt-10 flex justify-center gap-2 flex-wrap">
            <button
              onClick={() => handlePageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 glass border border-slate-900/10 dark:border-white/10 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-all"
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${
                  page === p
                    ? 'gradient-primary text-white'
                    : 'glass border border-slate-900/10 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 glass border border-slate-900/10 dark:border-white/10 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-all"
            >
              Next →
            </button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

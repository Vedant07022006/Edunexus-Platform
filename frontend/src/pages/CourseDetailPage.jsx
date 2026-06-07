import { useParams } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import CourseDetails from '../components/courses/CourseDetails';
import Footer from '../components/layout/Footer';

export default function CourseDetailPage() {
  const { courseId } = useParams();
  return (
    <div className="min-h-screen">
      <Navbar />
      <CourseDetails courseId={courseId} />
      <Footer />
    </div>
  );
}

import { useParams } from 'react';
import Navbar from '../../shared/components/Navbar';
import CourseDetails from '../components/CourseDetails';
import Footer from '../../shared/components/Footer';

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

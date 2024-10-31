import React from 'react';
import Image from 'next/image';

const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">About ChatChamp.ai</h1>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
        <p className="mb-4">
          At ChatChamp.ai, we're on a mission to revolutionize social skills training through the power of AI. We believe that everyone deserves the opportunity to become a confident and effective communicator, regardless of their background or natural abilities.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">What We Offer</h2>
        <ul className="list-disc pl-6 mb-4">
          <li>Interactive AI-powered role-playing scenarios</li>
          <li>Real-time feedback on communication skills</li>
          <li>Personalized learning paths</li>
          <li>Progress tracking and analytics</li>
          <li>A safe, judgment-free environment to practice</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Our Team</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center space-x-4">
            <Image src="/images/team-member-1.jpg" alt="John Doe" width={80} height={80} className="rounded-full" />
            <div>
              <h3 className="font-semibold">John Doe</h3>
              <p className="text-sm text-gray-600">Founder & CEO</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Image src="/images/team-member-2.jpg" alt="Jane Smith" width={80} height={80} className="rounded-full" />
            <div>
              <h3 className="font-semibold">Jane Smith</h3>
              <p className="text-sm text-gray-600">Chief Technology Officer</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Our Story</h2>
        <p className="mb-4">
          ChatChamp.ai was born out of a personal struggle with social anxiety. Our founder, John Doe, realized that while there were many resources for learning technical skills, there was a lack of effective tools for improving social skills. This led to the creation of ChatChamp.ai, combining cutting-edge AI technology with proven communication techniques to help people become more confident and skilled in their interactions.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
        <p className="mb-4">
          Have questions or feedback? We'd love to hear from you! Reach out to us at <a href="mailto:support@chatchamp.ai" className="text-blue-600 hover:underline">support@chatchamp.ai</a>.
        </p>
      </section>
    </div>
  );
};

export default AboutPage;

// Console log for error catching
console.log('AboutPage component loaded');


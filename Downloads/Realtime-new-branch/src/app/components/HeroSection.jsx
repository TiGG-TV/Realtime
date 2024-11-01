import React from 'react';

const HeroSection = () => {
  return (
    <section className="bg-gray-100 py-16 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Master Social Skills</h1>
        <p className="text-xl text-gray-600 mb-8">
          Elevate your conversations. Perfect your interactions. Transform your social life.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm">Interactive role-play</span>
          <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm">Real-time feedback</span>
          <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm">Measurable growth</span>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

// Console log for error catching
console.log('HeroSection component rendered');

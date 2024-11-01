'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getBlogPost, BlogPost } from '../../../firebase/blogOperations';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

const BlogPostPage: React.FC = () => {
  const { id } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      if (typeof id === 'string') {
        try {
          const fetchedPost = await getBlogPost(id);
          setPost(fetchedPost);
        } catch (error) {
          console.error('Error fetching blog post:', error);
        }
      }
    };
    fetchPost();
  }, [id]);

  if (!post) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{post.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">{post.date}</p>
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        </CardContent>
      </Card>
    </div>
  );
};

export default BlogPostPage;

console.log('BlogPostPage component loaded');

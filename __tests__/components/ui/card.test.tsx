import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

describe('Card Components', () => {
  describe('Card', () => {
    it('should render card container', () => {
      const { container } = render(<Card>Card Content</Card>);
      const card = container.firstChild;
      expect(card).toBeInTheDocument();
    });

    it('should apply default styles', () => {
      const { container } = render(<Card>Test</Card>);
      const card = container.firstChild;
      expect(card).toHaveClass('rounded-xl');
    });

    it('should apply custom className', () => {
      const { container } = render(<Card className="custom-card">Test</Card>);
      const card = container.firstChild;
      expect(card).toHaveClass('custom-card');
    });

    it('should render children', () => {
      render(<Card>Card Children</Card>);
      expect(screen.getByText('Card Children')).toBeInTheDocument();
    });
  });

  describe('CardHeader', () => {
    it('should render header section', () => {
      const { container } = render(<CardHeader>Header</CardHeader>);
      const header = container.firstChild;
      expect(header).toBeInTheDocument();
    });

    it('should apply header styles', () => {
      const { container } = render(<CardHeader>Test</CardHeader>);
      const header = container.firstChild;
      expect(header).toHaveClass('flex');
      expect(header).toHaveClass('flex-col');
    });
  });

  describe('CardTitle', () => {
    it('should render title text', () => {
      render(<CardTitle>My Card Title</CardTitle>);
      expect(screen.getByText('My Card Title')).toBeInTheDocument();
    });

    it('should apply title styles', () => {
      const { container } = render(<CardTitle>Title</CardTitle>);
      const title = container.firstChild;
      expect(title).toHaveClass('text-xl');
      expect(title).toHaveClass('font-bold');
    });

    it('should render as h3 by default', () => {
      const { container } = render(<CardTitle>Title</CardTitle>);
      const title = container.querySelector('h3');
      expect(title).toBeInTheDocument();
    });
  });

  describe('CardDescription', () => {
    it('should render description text', () => {
      render(<CardDescription>Card description here</CardDescription>);
      expect(screen.getByText('Card description here')).toBeInTheDocument();
    });

    it('should apply description styles', () => {
      const { container } = render(<CardDescription>Test</CardDescription>);
      const description = container.firstChild;
      expect(description).toHaveClass('text-sm');
    });
  });

  describe('CardContent', () => {
    it('should render content section', () => {
      render(<CardContent>Content goes here</CardContent>);
      expect(screen.getByText('Content goes here')).toBeInTheDocument();
    });

    it('should have minimal styling by default', () => {
      const { container } = render(<CardContent>Test</CardContent>);
      const content = container.firstChild;
      expect(content).toBeInTheDocument();
    });
  });

  describe('CardFooter', () => {
    it('should render footer section', () => {
      render(<CardFooter>Footer content</CardFooter>);
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('should apply footer styles', () => {
      const { container } = render(<CardFooter>Test</CardFooter>);
      const footer = container.firstChild;
      expect(footer).toHaveClass('flex');
    });
  });

  describe('Complete Card', () => {
    it('should render all card sections together', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
          <CardContent>Main Content</CardContent>
          <CardFooter>Footer Actions</CardFooter>
        </Card>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('Main Content')).toBeInTheDocument();
      expect(screen.getByText('Footer Actions')).toBeInTheDocument();
    });

    it('should maintain proper structure', () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
          </CardHeader>
          <CardContent>Content</CardContent>
        </Card>
      );

      const card = container.firstChild;
      expect(card?.childNodes.length).toBe(2); // Header + Content
    });

    it('should handle optional sections', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Title Only</CardTitle>
          </CardHeader>
          <CardContent>Just Content, No Footer</CardContent>
        </Card>
      );

      expect(screen.getByText('Title Only')).toBeInTheDocument();
      expect(screen.getByText('Just Content, No Footer')).toBeInTheDocument();
      expect(screen.queryByText('Footer')).not.toBeInTheDocument();
    });
  });
});

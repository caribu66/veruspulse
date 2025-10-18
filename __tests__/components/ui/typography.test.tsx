import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Heading, Text, TextLink } from '@/components/ui/typography';

describe('Typography Components', () => {
  describe('Heading', () => {
    it('should render h2 by default', () => {
      render(<Heading>Main Title</Heading>);
      const heading = screen.getByText('Main Title');
      expect(heading.tagName).toBe('H2');
    });

    it('should render different heading levels', () => {
      const { rerender } = render(<Heading as="h2">Level 2</Heading>);
      expect(screen.getByText('Level 2').tagName).toBe('H2');

      rerender(<Heading as="h3">Level 3</Heading>);
      expect(screen.getByText('Level 3').tagName).toBe('H3');

      rerender(<Heading as="h4">Level 4</Heading>);
      expect(screen.getByText('Level 4').tagName).toBe('H4');
    });

    it('should apply size classes', () => {
      const { container } = render(<Heading as="h1">Large Title</Heading>);
      const heading = container.querySelector('h1');
      // Heading has responsive sizing
      expect(heading).toHaveClass('text-3xl');
    });

    it('should apply weight classes', () => {
      const { container } = render(<Heading weight="bold">Bold Title</Heading>);
      const heading = container.querySelector('h2'); // Heading defaults to h2
      expect(heading).toHaveClass('font-bold');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <Heading className="custom-heading">Test</Heading>
      );
      const heading = container.querySelector('h2'); // Heading defaults to h2
      expect(heading).toHaveClass('custom-heading');
    });

    it('should apply white text color by default', () => {
      const { container } = render(<Heading>Default Title</Heading>);
      const heading = container.querySelector('h2'); // Heading defaults to h2
      expect(heading).toHaveClass('text-white');
    });

    it('should apply leading and tracking', () => {
      const { container } = render(<Heading>Title</Heading>);
      const heading = container.querySelector('h2'); // Heading defaults to h2
      expect(heading).toHaveClass('leading-tight');
      expect(heading).toHaveClass('tracking-tight');
    });
  });

  describe('Text', () => {
    it('should render as paragraph by default', () => {
      render(<Text>Body text</Text>);
      const text = screen.getByText('Body text');
      expect(text.tagName).toBe('P');
    });

    it('should render as different elements', () => {
      const { rerender } = render(<Text as="span">Span Text</Text>);
      expect(screen.getByText('Span Text').tagName).toBe('SPAN');

      rerender(<Text as="div">Div Text</Text>);
      expect(screen.getByText('Div Text').tagName).toBe('DIV');

      rerender(<Text as="label">Label Text</Text>);
      expect(screen.getByText('Label Text').tagName).toBe('LABEL');
    });

    it('should apply size classes', () => {
      const { container } = render(<Text size="sm">Small Text</Text>);
      const text = container.querySelector('p');
      expect(text).toHaveClass('text-sm');
    });

    it('should apply muted style', () => {
      const { container } = render(<Text muted>Muted Text</Text>);
      const text = container.querySelector('p');
      expect(text).toHaveClass('text-gray-400');
    });

    it('should apply dimmed style', () => {
      const { container } = render(<Text dimmed>Dimmed Text</Text>);
      const text = container.querySelector('p');
      expect(text).toHaveClass('text-gray-500');
    });

    it('should apply monospace font', () => {
      const { container } = render(<Text mono>Mono Text</Text>);
      const text = container.querySelector('p');
      expect(text).toHaveClass('font-mono');
    });

    it('should combine multiple styles', () => {
      const { container } = render(
        <Text size="lg" weight="semibold" muted>
          Styled Text
        </Text>
      );
      const text = container.querySelector('p');
      expect(text).toHaveClass('text-lg');
      expect(text).toHaveClass('font-semibold');
      expect(text).toHaveClass('text-gray-400');
    });
  });

  describe('TextLink', () => {
    it('should render as anchor element', () => {
      render(<TextLink href="/test">Link Text</TextLink>);
      const link = screen.getByText('Link Text');
      expect(link.tagName).toBe('A');
    });

    it('should apply href attribute', () => {
      render(<TextLink href="/test-page">Test Link</TextLink>);
      const link = screen.getByText('Test Link');
      expect(link).toHaveAttribute('href', '/test-page');
    });

    it('should open external links in new tab', () => {
      render(
        <TextLink href="https://example.com" external>
          External Link
        </TextLink>
      );
      const link = screen.getByText('External Link');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should show external link icon', () => {
      const { container } = render(
        <TextLink href="https://example.com" external>
          External
        </TextLink>
      );
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should apply link styles', () => {
      const { container } = render(<TextLink href="/test">Link</TextLink>);
      const link = container.querySelector('a');
      expect(link).toHaveClass('text-blue-400');
      expect(link).toHaveClass('underline');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <TextLink href="/test" className="custom-link">
          Link
        </TextLink>
      );
      const link = container.querySelector('a');
      expect(link).toHaveClass('custom-link');
    });
  });

  describe('Accessibility', () => {
    it('should have proper text color on headings', () => {
      const { container } = render(<Heading>Focusable Title</Heading>);
      const heading = container.querySelector('h2'); // Heading defaults to h2
      expect(heading).toHaveClass('text-white');
    });

    it('should have proper focus styles on links', () => {
      const { container } = render(
        <TextLink href="/test">Focusable Link</TextLink>
      );
      const link = container.querySelector('a');
      expect(link).toHaveClass('focus:ring-2');
    });

    it('should indicate external links with aria-label', () => {
      const { container } = render(
        <TextLink href="https://example.com" external>
          External
        </TextLink>
      );
      const icon = container.querySelector(
        '[aria-label="Opens in new window"]'
      );
      expect(icon).toBeInTheDocument();
    });
  });
});

/**
 * UX/UI Consistency Tests
 * Automated detection of design inconsistencies across components
 */

import fs from 'fs';
import path from 'path';

describe('UX/UI Consistency Checker', () => {
  const componentsDir = path.join(process.cwd(), 'components');
  const appDir = path.join(process.cwd(), 'app');

  // Helper to recursively get all component files
  const getAllFiles = (dir: string, fileList: string[] = []): string[] => {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        if (!file.includes('node_modules') && !file.includes('.next')) {
          getAllFiles(filePath, fileList);
        }
      } else if (
        file.endsWith('.tsx') ||
        file.endsWith('.jsx') ||
        file.endsWith('.ts')
      ) {
        fileList.push(filePath);
      }
    });

    return fileList;
  };

  const componentFiles = getAllFiles(componentsDir);
  const appFiles = getAllFiles(appDir);
  const allFiles = [...componentFiles, ...appFiles];

  describe('Color Palette Consistency', () => {
    it('should use consistent blue shades', () => {
      const blueShades = new Map<string, number>();
      const issues: string[] = [];

      allFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');

        // Find all bg-blue-* classes
        const blueMatches = content.match(/bg-blue-\d+/g) || [];
        blueMatches.forEach(match => {
          blueShades.set(match, (blueShades.get(match) || 0) + 1);
        });

        // Check for inconsistent blue usage in single file
        const uniqueBlues = new Set(blueMatches);
        if (uniqueBlues.size > 3) {
          issues.push(
            `${path.basename(file)}: Uses ${uniqueBlues.size} different blue shades - consider standardizing`
          );
        }
      });

      console.log('\n📊 Blue Shade Usage:');
      Array.from(blueShades.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([shade, count]) => {
          console.log(`   ${shade}: ${count} occurrences`);
        });

      if (issues.length > 0) {
        console.warn('\n⚠️  Potential inconsistencies:');
        issues.forEach(issue => console.warn(`   ${issue}`));
      }

      // Should use a limited palette (typically 3-8 shades for hover states)
      expect(blueShades.size).toBeLessThanOrEqual(10);
    });

    it('should use consistent spacing units', () => {
      const spacingUnits = new Map<string, number>();
      const customSpacing: string[] = [];

      allFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');

        // Find spacing classes (p-, m-, gap-, space-)
        const spacingMatches =
          content.match(
            /(p|m|gap|space)-(x|y|t|b|l|r)?-(\d+|px|auto|\[[\d.]+(?:rem|px|em)\])/g
          ) || [];

        spacingMatches.forEach(match => {
          spacingUnits.set(match, (spacingUnits.get(match) || 0) + 1);

          // Flag custom spacing values
          if (match.includes('[') && !match.includes('max-w')) {
            customSpacing.push(`${path.basename(file)}: ${match}`);
          }
        });
      });

      console.log('\n📏 Top 10 Spacing Patterns:');
      Array.from(spacingUnits.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([unit, count]) => {
          console.log(`   ${unit}: ${count} uses`);
        });

      if (customSpacing.length > 0) {
        console.log('\n🎨 Custom Spacing Values (review for consistency):');
        customSpacing.slice(0, 15).forEach(spacing => {
          console.log(`   ${spacing}`);
        });
      }

      // Verify using standard Tailwind spacing scale
      const standardSpacing = Array.from(spacingUnits.keys()).every(unit => {
        return (
          unit.match(/-(0|1|2|3|4|5|6|8|10|12|16|20|24|32|px|auto)($|\s)/) ||
          unit.includes('[')
        );
      });

      expect(standardSpacing).toBe(true);
    });

    it('should use consistent text sizes', () => {
      const textSizes = new Map<string, number>();

      allFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');

        const sizeMatches =
          content.match(/text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)/g) || [];
        sizeMatches.forEach(match => {
          textSizes.set(match, (textSizes.get(match) || 0) + 1);
        });
      });

      console.log('\n📝 Typography Scale Usage:');
      Array.from(textSizes.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([size, count]) => {
          console.log(`   ${size}: ${count} uses`);
        });

      // Should have good distribution across sizes
      expect(textSizes.size).toBeGreaterThan(4);
      expect(textSizes.get('text-base')).toBeGreaterThan(0);
    });
  });

  describe('Component Consistency', () => {
    it('should use consistent button patterns', () => {
      const buttonPatterns = {
        variants: new Set<string>(),
        sizes: new Set<string>(),
        inconsistencies: [] as string[],
      };

      allFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');

        // Check for inline button styling vs component usage
        const inlineButtons =
          content.match(
            /className="[^"]*\bbg-(blue|red|green)-\d+[^"]*"[^>]*>.*?button/gi
          ) || [];
        const componentButtons = content.match(/<Button\s/g) || [];

        if (inlineButtons.length > 3 && componentButtons.length === 0) {
          buttonPatterns.inconsistencies.push(
            `${path.basename(file)}: ${inlineButtons.length} inline buttons - consider using <Button> component`
          );
        }

        // Track button variants
        const variantMatches =
          content.match(
            /variant="(primary|secondary|danger|ghost|success)"/g
          ) || [];
        variantMatches.forEach(match => {
          buttonPatterns.variants.add(match);
        });

        // Track button sizes
        const sizeMatches = content.match(/size="(sm|md|lg)"/g) || [];
        sizeMatches.forEach(match => {
          buttonPatterns.sizes.add(match);
        });
      });

      console.log('\n🔘 Button Patterns:');
      console.log(`   Variants: ${buttonPatterns.variants.size}`);
      console.log(`   Sizes: ${buttonPatterns.sizes.size}`);

      if (buttonPatterns.inconsistencies.length > 0) {
        console.warn('\n⚠️  Button Inconsistencies:');
        buttonPatterns.inconsistencies.slice(0, 5).forEach(issue => {
          console.warn(`   ${issue}`);
        });
      }

      // Should use Button component consistently
      expect(buttonPatterns.inconsistencies.length).toBeLessThan(
        allFiles.length * 0.2
      );
    });

    it('should use consistent card components', () => {
      const cardUsage = {
        componentCards: 0,
        inlineCards: 0,
        files: [] as string[],
      };

      allFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');

        const cardComponents = (content.match(/<Card[\s>]/g) || []).length;
        const inlineCardStyles = (
          content.match(
            /className="[^"]*rounded-(lg|xl|2xl)[^"]*bg-white\/\d+/g
          ) || []
        ).length;

        cardUsage.componentCards += cardComponents;
        cardUsage.inlineCards += inlineCardStyles;

        if (inlineCardStyles > 2 && cardComponents === 0) {
          cardUsage.files.push(path.basename(file));
        }
      });

      console.log('\n🗂️  Card Component Usage:');
      console.log(`   <Card> components: ${cardUsage.componentCards}`);
      console.log(`   Inline card styles: ${cardUsage.inlineCards}`);

      if (cardUsage.files.length > 0) {
        console.warn('\n💡 Files that could use <Card> component:');
        cardUsage.files.slice(0, 5).forEach(file => {
          console.warn(`   ${file}`);
        });
      }

      // Most cards should use the component
      expect(cardUsage.componentCards).toBeGreaterThan(0);
    });

    it('should have consistent heading hierarchy', () => {
      const headingIssues: string[] = [];

      allFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        const baseName = path.basename(file);

        // Check for multiple h1 tags (should typically only have one per page)
        const h1Count = (content.match(/<h1[\s>]/gi) || []).length;
        if (h1Count > 1) {
          headingIssues.push(
            `${baseName}: Multiple h1 tags (${h1Count}) - should have only one`
          );
        }

        // Check heading order (shouldn't skip levels)
        const hasH1 = content.includes('<h1');
        const hasH3 = content.includes('<h3');
        const hasH2 = content.includes('<h2');

        if (hasH1 && hasH3 && !hasH2) {
          headingIssues.push(`${baseName}: Skips from h1 to h3 (missing h2)`);
        }
      });

      if (headingIssues.length > 0) {
        console.warn('\n⚠️  Heading Hierarchy Issues:');
        headingIssues.slice(0, 10).forEach(issue => {
          console.warn(`   ${issue}`);
        });
      }

      // Most files should follow heading hierarchy
      expect(headingIssues.length).toBeLessThan(allFiles.length * 0.1);
    });
  });

  describe('Accessibility Consistency', () => {
    it('should have aria-labels on interactive elements', () => {
      const accessibilityIssues: string[] = [];

      allFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        const baseName = path.basename(file);

        // Check for buttons without accessible names
        const buttonMatches = content.match(/<button[^>]*>/gi) || [];
        buttonMatches.forEach(match => {
          if (
            !match.includes('aria-label') &&
            !match.includes('aria-labelledby') &&
            !match.includes('>') // Has text content
          ) {
            // Only flag icon-only buttons
            const afterButton = content.slice(
              content.indexOf(match) + match.length,
              content.indexOf(match) + match.length + 50
            );
            if (
              afterButton.trim().startsWith('<svg') ||
              afterButton.trim().startsWith('<')
            ) {
              accessibilityIssues.push(
                `${baseName}: Button without aria-label`
              );
            }
          }
        });

        // Check for images without alt text
        const imgMatches = content.match(/<img[^>]*>/gi) || [];
        imgMatches.forEach(match => {
          if (!match.includes('alt=')) {
            accessibilityIssues.push(`${baseName}: Image without alt text`);
          }
        });

        // Check for form inputs without labels
        const inputMatches =
          content.match(/<input[^>]*type="text"[^>]*>/gi) || [];
        inputMatches.forEach(match => {
          if (
            !match.includes('aria-label') &&
            !match.includes('placeholder') &&
            !match.includes('aria-labelledby')
          ) {
            accessibilityIssues.push(`${baseName}: Input without label`);
          }
        });
      });

      if (accessibilityIssues.length > 0) {
        console.warn('\n♿ Accessibility Issues Found:');
        const uniqueIssues = Array.from(new Set(accessibilityIssues));
        uniqueIssues.slice(0, 15).forEach(issue => {
          console.warn(`   ${issue}`);
        });
        console.warn(`   ...and ${Math.max(0, uniqueIssues.length - 15)} more`);
      } else {
        console.log('\n✅ No major accessibility issues found');
      }

      // Should have good accessibility coverage
      expect(accessibilityIssues.length).toBeLessThan(50);
    });

    it('should use consistent focus states', () => {
      const focusPatterns = {
        ring: 0,
        outline: 0,
        custom: 0,
        none: 0,
      };

      allFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');

        focusPatterns.ring += (content.match(/focus:ring/g) || []).length;
        focusPatterns.outline += (content.match(/focus:outline/g) || []).length;
        focusPatterns.custom += (
          content.match(/focus:border|focus:shadow/g) || []
        ).length;
      });

      console.log('\n🎯 Focus State Patterns:');
      console.log(`   focus:ring: ${focusPatterns.ring}`);
      console.log(`   focus:outline: ${focusPatterns.outline}`);
      console.log(`   Custom focus: ${focusPatterns.custom}`);

      // Should primarily use one focus pattern
      const total =
        focusPatterns.ring + focusPatterns.outline + focusPatterns.custom;
      const dominant = Math.max(
        focusPatterns.ring,
        focusPatterns.outline,
        focusPatterns.custom
      );
      const consistency = (dominant / total) * 100;

      console.log(`   Consistency: ${consistency.toFixed(1)}%`);

      expect(consistency).toBeGreaterThan(50);
    });
  });

  describe('Typography Consistency', () => {
    it('should use consistent font weights', () => {
      const fontWeights = new Map<string, number>();
      const issues: string[] = [];

      allFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        const baseName = path.basename(file);

        const weightMatches =
          content.match(
            /font-(normal|medium|semibold|bold|extrabold|black)/g
          ) || [];
        weightMatches.forEach(match => {
          fontWeights.set(match, (fontWeights.get(match) || 0) + 1);
        });

        // Check for inconsistent weights in headings
        const headingWeights =
          content.match(
            /<h[1-6][^>]*class="[^"]*font-(light|thin|extralight)/gi
          ) || [];
        if (headingWeights.length > 0) {
          issues.push(
            `${baseName}: Heading with light font weight - headings should be bold`
          );
        }
      });

      console.log('\n🔤 Font Weight Distribution:');
      Array.from(fontWeights.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([weight, count]) => {
          console.log(`   ${weight}: ${count} uses`);
        });

      if (issues.length > 0) {
        console.warn('\n⚠️  Font Weight Issues:');
        issues.forEach(issue => console.warn(`   ${issue}`));
      }

      expect(fontWeights.size).toBeLessThan(6);
    });

    it('should use consistent text colors', () => {
      const textColors = new Map<string, number>();

      allFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');

        const colorMatches =
          content.match(
            /text-(white|gray|blue|red|green|yellow|purple)-(\d+|black|white)/g
          ) || [];
        colorMatches.forEach(match => {
          textColors.set(match, (textColors.get(match) || 0) + 1);
        });
      });

      console.log('\n🎨 Text Color Usage (Top 15):');
      Array.from(textColors.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .forEach(([color, count]) => {
          console.log(`   ${color}: ${count} uses`);
        });

      // Should have a defined color palette
      // text-white is often used, if not found, check for common grays
      const hasWhiteOrGray =
        textColors.get('text-white') ||
        textColors.get('text-gray-100') ||
        textColors.get('text-gray-400');
      expect(hasWhiteOrGray).toBeDefined();
      expect(textColors.size).toBeGreaterThan(5); // Should have variety
    });
  });

  describe('Component Naming Consistency', () => {
    it('should use consistent component file naming', () => {
      const namingPatterns = {
        PascalCase: 0,
        kebabCase: 0,
        camelCase: 0,
        inconsistent: [] as string[],
      };

      componentFiles.forEach(file => {
        const fileName = path.basename(file, path.extname(file));

        if (fileName.match(/^[A-Z][a-zA-Z]+$/)) {
          namingPatterns.PascalCase++;
        } else if (fileName.match(/^[a-z]+(-[a-z]+)*$/)) {
          namingPatterns.kebabCase++;
        } else if (fileName.match(/^[a-z][a-zA-Z]+$/)) {
          namingPatterns.camelCase++;
        } else {
          namingPatterns.inconsistent.push(fileName);
        }
      });

      console.log('\n📁 Component Naming:');
      console.log(`   PascalCase: ${namingPatterns.PascalCase}`);
      console.log(`   kebab-case: ${namingPatterns.kebabCase}`);
      console.log(`   camelCase: ${namingPatterns.camelCase}`);

      if (namingPatterns.inconsistent.length > 0) {
        console.warn('\n⚠️  Inconsistent naming:');
        namingPatterns.inconsistent.slice(0, 10).forEach(name => {
          console.warn(`   ${name}`);
        });
      }

      // Should primarily use one naming convention
      const total =
        namingPatterns.PascalCase +
        namingPatterns.kebabCase +
        namingPatterns.camelCase;
      const dominant = Math.max(
        namingPatterns.PascalCase,
        namingPatterns.kebabCase,
        namingPatterns.camelCase
      );
      const consistency = (dominant / total) * 100;

      console.log(`   Consistency: ${consistency.toFixed(1)}%`);

      expect(consistency).toBeGreaterThan(70);
    });

    it('should have consistent loading state patterns', () => {
      const loadingPatterns = {
        isLoading: 0,
        loading: 0,
        pending: 0,
        fetching: 0,
      };

      allFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');

        loadingPatterns.isLoading += (
          content.match(/\bisLoading\b/g) || []
        ).length;
        loadingPatterns.loading += (content.match(/\bloading\b/g) || []).length;
        loadingPatterns.pending += (content.match(/\bpending\b/g) || []).length;
        loadingPatterns.fetching += (
          content.match(/\bfetching\b/g) || []
        ).length;
      });

      console.log('\n⏳ Loading State Patterns:');
      console.log(`   isLoading: ${loadingPatterns.isLoading}`);
      console.log(`   loading: ${loadingPatterns.loading}`);
      console.log(`   pending: ${loadingPatterns.pending}`);
      console.log(`   fetching: ${loadingPatterns.fetching}`);

      // Should have consistent loading state naming
      const total = Object.values(loadingPatterns).reduce((a, b) => a + b, 0);
      const dominant = Math.max(...Object.values(loadingPatterns));
      const consistency = total > 0 ? (dominant / total) * 100 : 100;

      console.log(`   Consistency: ${consistency.toFixed(1)}%`);

      expect(consistency).toBeGreaterThan(50);
    });
  });

  describe('Animation Consistency', () => {
    it('should use consistent transition durations', () => {
      const durations = new Map<string, number>();

      allFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');

        const durationMatches = content.match(/duration-(\d+)/g) || [];
        durationMatches.forEach(match => {
          durations.set(match, (durations.get(match) || 0) + 1);
        });
      });

      console.log('\n⏱️  Transition Durations:');
      Array.from(durations.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([duration, count]) => {
          console.log(`   ${duration}: ${count} uses`);
        });

      // Should use standard durations
      const standardDurations = Array.from(durations.keys()).every(duration => {
        return duration.match(/duration-(75|100|150|200|300|500|700|1000)/);
      });

      expect(standardDurations).toBe(true);
    });

    it('should use consistent hover effects', () => {
      const hoverEffects = new Map<string, number>();

      allFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');

        const effects =
          content.match(/hover:(bg-|text-|border-|scale-|opacity-|shadow-)/g) ||
          [];
        effects.forEach(effect => {
          hoverEffects.set(effect, (hoverEffects.get(effect) || 0) + 1);
        });
      });

      console.log('\n✨ Hover Effect Patterns (Top 10):');
      Array.from(hoverEffects.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([effect, count]) => {
          console.log(`   ${effect}: ${count} uses`);
        });

      // Should have hover effects
      expect(hoverEffects.size).toBeGreaterThan(3);
    });
  });

  describe('Error Handling Consistency', () => {
    it('should have consistent error message patterns', () => {
      const errorPatterns = {
        errorBoundary: 0,
        tryAgain: 0,
        errorState: 0,
        files: [] as string[],
      };

      allFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');

        errorPatterns.errorBoundary += (
          content.match(/ErrorBoundary/g) || []
        ).length;
        errorPatterns.tryAgain += (
          content.match(/Try Again|Retry/gi) || []
        ).length;
        errorPatterns.errorState += (
          content.match(/\berror\s*:/g) || []
        ).length;

        // Check for console.error usage
        const consoleErrors = content.match(/console\.error/g) || [];
        if (consoleErrors.length > 0) {
          errorPatterns.files.push(
            `${path.basename(file)} (${consoleErrors.length})`
          );
        }
      });

      console.log('\n🚨 Error Handling Patterns:');
      console.log(`   ErrorBoundary: ${errorPatterns.errorBoundary} uses`);
      console.log(`   Retry buttons: ${errorPatterns.tryAgain} uses`);
      console.log(`   Error states: ${errorPatterns.errorState} files`);
      console.log(`   Console.error: ${errorPatterns.files.length} files`);

      // Should have error handling
      expect(errorPatterns.errorState).toBeGreaterThan(0);
    });
  });

  describe('Responsive Design Consistency', () => {
    it('should use consistent breakpoint patterns', () => {
      const breakpoints = {
        sm: 0,
        md: 0,
        lg: 0,
        xl: 0,
        '2xl': 0,
      };

      allFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');

        breakpoints.sm += (content.match(/\bsm:/g) || []).length;
        breakpoints.md += (content.match(/\bmd:/g) || []).length;
        breakpoints.lg += (content.match(/\blg:/g) || []).length;
        breakpoints.xl += (content.match(/\bxl:/g) || []).length;
        breakpoints['2xl'] += (content.match(/\b2xl:/g) || []).length;
      });

      console.log('\n📱 Responsive Breakpoint Usage:');
      Object.entries(breakpoints).forEach(([bp, count]) => {
        console.log(`   ${bp}: ${count} uses`);
      });

      // Should use responsive design
      expect(breakpoints.md).toBeGreaterThan(0);
      expect(breakpoints.lg).toBeGreaterThan(0);
    });

    it('should have mobile-friendly touch targets', () => {
      const touchTargetIssues: string[] = [];

      allFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        const baseName = path.basename(file);

        // Check for very small buttons (< 44px is not WCAG compliant)
        const smallButtons =
          content.match(
            /className="[^"]*\b(h-[1-7]|w-[1-7])\b[^"]*"[^>]*button/gi
          ) || [];
        if (smallButtons.length > 3) {
          touchTargetIssues.push(
            `${baseName}: ${smallButtons.length} potentially small buttons`
          );
        }
      });

      if (touchTargetIssues.length > 0) {
        console.warn('\n📏 Touch Target Warnings:');
        touchTargetIssues.slice(0, 5).forEach(issue => {
          console.warn(`   ${issue}`);
        });
      } else {
        console.log('\n✅ Touch targets appear WCAG compliant');
      }

      // Most files should have proper touch targets
      expect(touchTargetIssues.length).toBeLessThan(allFiles.length * 0.3);
    });
  });

  describe('Code Organization', () => {
    it('should separate UI components from business logic', () => {
      const organizationIssues: string[] = [];

      componentFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        const baseName = path.basename(file);

        // Check for database queries in components
        if (content.includes('Pool(') || content.includes('db.query')) {
          organizationIssues.push(
            `${baseName}: Contains database queries - should use service layer`
          );
        }

        // Check for complex calculations in components
        const complexMathCount = (
          content.match(/Math\.(sqrt|pow|abs|floor|ceil)/g) || []
        ).length;
        if (complexMathCount > 5) {
          organizationIssues.push(
            `${baseName}: ${complexMathCount} complex math operations - consider utils`
          );
        }
      });

      if (organizationIssues.length > 0) {
        console.warn('\n🏗️  Organization Suggestions:');
        organizationIssues.slice(0, 10).forEach(issue => {
          console.warn(`   ${issue}`);
        });
      } else {
        console.log('\n✅ Good separation of concerns');
      }

      // Should have clean separation
      expect(organizationIssues.length).toBeLessThan(10);
    });
  });
});

# Design System (Impeccable Guidelines)

## Visual Theme & Brand Identity
The UI follows a **Sleek Clean Slate & White** aesthetic. It aims to be highly professional, minimalistic, and data-centric.

## Impeccable Anti-Patterns (STRICTLY AVOID)
To prevent "AI Slop" and cliché designs, the following are **strictly forbidden**:
- ❌ **No Overused Fonts**: Do NOT use Inter, Arial, Roboto, or system defaults. Use distinctive modern typography (e.g., Outfit, Plus Jakarta Sans, or similar geometric/grotesque fonts).
- ❌ **No Purple-to-Blue Gradients**: Avoid the generic "AI startup" gradients.
- ❌ **No Pure Black/Gray**: Never use `#000000` or `#888888`. Always tint grays with a touch of the brand color (e.g., a very dark charcoal with a blue tint).
- ❌ **No Cards within Cards**: Do not nest bordered boxes inside other bordered boxes. Use whitespace and typography to create hierarchy instead.
- ❌ **No Gray Text on Colored Backgrounds**: It ruins contrast and looks muddy.
- ❌ **No Bounce/Elastic Easing**: Spring animations feel dated. Use smooth, purposeful bezier curves for easing.
- ❌ **No Dark Glows**: Avoid heavy drop shadows that look like dirt. Shadows must be extremely soft, tinted, and diffuse.

## Typography
- **Primary Font**: `Plus Jakarta Sans` or `Outfit` (Modern, readable, geometric).
- **Hierarchy**: Rely on size and weight differences rather than borders.
- **Sizes**: Mobile-first, legible text. No text smaller than 14px.

## Color Palette
- **Background**: True White (`#FFFFFF`) or slightly tinted Off-White.
- **Text**: Deep tinted charcoal (e.g., `#111827` but adjusted to the brand hue).
- **Accents**: Use single, strong, solid brand colors. No generic gradients.

## Layout & Components
- **Whitespace Over Borders**: Separate sections using generous padding (`gap-8`, `gap-12`) instead of drawing lines between them.
- **Touch Targets**: Minimum 48x48px on mobile for all interactive elements.
- **Feedback States**: Clear, immediate visual feedback on hover/active states using opacity or slight scale (no bouncy springs).

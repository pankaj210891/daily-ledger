---
name: component-guidelines
description: Apply this repository's formatting, component design, and component size guidance when editing code or reviewing UI components.
metadata:
  short-description: Code and component guidelines
---

# Code and component guidelines

## Formatting

- Format written code with Prettier, using the repository's configuration when present and Prettier defaults otherwise.

## Component design

- Keep components focused. A component should generally manage complex state or render detailed UI, but rarely both.
- Consider splitting when a component has five or more state/effect hooks, deeply nested JSX or complex inline conditionals, or repeated markup that can become a reusable child component. Treat these as signals to review the design, not automatic rules.
- Extract stateful logic, API calls, and event handlers into custom hooks when that makes the component easier to understand.
- Extract complex UI into child components that receive data through props. Move pure transformations, formatting, and validation helpers into utilities when they are reusable or distract from the component's main job.

## Component size

- Aim for 20–80 lines for simple, stateless UI components such as buttons, cards, and badges.
- Standard feature components with local state, handlers, or conditional rendering commonly fit in 50–200 lines.
- Review files above 300 lines for unrelated responsibilities and consider splitting them; files approaching or exceeding 500 lines are a strong refactoring signal.
- Treat line counts as guidance, not a substitute for cohesion and readability.

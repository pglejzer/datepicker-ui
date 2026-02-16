# Copilot Architecture & Code Rules for **datepicker-ui**

Copilot MUST ALWAYS generate code using the following architecture, rules, and constraints.
These rules are absolute and have the highest priority.

---

# 1. Architecture — Composition Only

## Hard rules:

* Never use inheritance.
* Never use `extends`.
* Never create class hierarchies.
* Always use explicit composition.
* Always inject dependencies through constructors.

## Required Modules (ONLY these are allowed):

DatepickerUI — top-level orchestrator
CoreState — pure state container (no logic)
EventEmitter — event system
Managers (composition container)
├── CalendarManager
├── ModalManager
├── InputManager
├── AnimationManager
├── ConfigManager
├── ThemeManager
└── ValidationManager
Lifecycle — mount / unmount orchestration

**All new functionality MUST be implemented as new manager classes.**

---

# 2. Dependency Flow (Strict)

Managers MUST receive ONLY:

* `core: CoreState`
* `emitter: EventEmitter`

Managers MUST NOT:

* receive the entire DatepickerUI instance
* depend on each other directly
* read or mutate DOM until `.init()`

Managers communicate ONLY through methods exposed by the Managers container.

Lifecycle owns all orchestration logic.

---

# 3. TypeScript Rules (Hard)

* No `any`
* No `unknown`
* No type assertions (`as any`, `as unknown as`, etc.)
* No `!` non-null assertions
* No implicit any
* No disabled TS checks
* Fully typed, strict TS everywhere
* Every event has a dedicated typed payload
* Every method has typed args + return type
* No optional fields unless **absolutely necessary**

---

# 4. Engineering Best Practices

* KISS, DRY, YAGNI, SRP, SoC, DIP, ISP.
* No duplicated logic.
* No long functions.
* No monolithic classes.
* Pure functions for transformations.
* No state outside CoreState.
* Avoid unnecessary DOM interaction.
* Use rAF for animations.
* No functions created inside loops.
* No object mutation outside CoreState.
* No leaking internal references.

---

# 5. Coding Rules

## Constructors:

Only assign dependencies.
No DOM, no listeners, no timers, no side effects.

## State:

Only CoreState holds application state.
Managers may hold *only ephemeral flags*.

## Events:

All events use EventEmitter.
No DOM CustomEvents.
No dispatchEvent.

## Lifecycle:

* mount() → create managers → init → bind → ready
* unmount() → destroy managers → remove listeners → cleanup

---

# 6. Required File/Class Structure

class DatepickerUI { ... }
class CoreState { ... }
class EventEmitter { ... }
class Managers { ... }
class Lifecycle { ... }

Managers:

* CalendarManager
* ModalManager
* InputManager
* AnimationManager
* ConfigManager
* ThemeManager
* ValidationManager

Every new feature → new manager.

---

# 7. Prohibited Patterns

Copilot MUST NEVER generate:

* extends
* mixins
* decorators
* singletons
* multiple interface implementations
* static global state
* mutation of public fields
* logic inside constructors
* untyped functions
* default export for classes
* passing DatepickerUI instance to managers

---

# 8. UX & UI Rules

* CoreState is pure — no DOM.
* Managers handle UI.
* DOM queries must be cached.
* Animations: rAF + CSS transitions only.
* RTL and themes must be stateless and variable-driven.
* Responsive behavior must be predictable and modular.

---

# 9. Documentation Requirements

Copilot MUST generate:

* JSDoc for all public methods
* Types for all events
* Comments for complex logic only
* Clear distinction between public API and internals

---

# 10. SCSS Architecture & Rules

Everything under app/src/**/*.scss must follow:

## 10.1 Rules

* Max nesting depth: 2
* No `!important`
* No ID selectors
* No inline styles in TS
* Use CSS variables for tokens
* Predictable, flat SCSS
* BEM-like naming with prefix `dp-ui`
* No magic numbers

## 10.2 BEM Naming

Block:
`.dp-ui`

Elements:
`.dp-ui__input`
`.dp-ui__calendar`
`.dp-ui__day`
`.dp-ui__month`
`.dp-ui__year`
`.dp-ui__button`

Modifiers:
`.dp-ui--open`
`.dp-ui--closed`
`.dp-ui--mobile`
`.dp-ui--desktop`

States:
`.is-active`
`.is-disabled`
`.is-selected`

## 10.3 SCSS Structure Template

:root {
--dp-radius: 12px;
--dp-duration: 150ms;
--dp-elevation-3: 0 4px 12px rgba(0,0,0,0.12);
}

.dp-ui {
display: flex;
flex-direction: column;

&__input {
padding: var(--dp-spacing-md);
border-radius: var(--dp-radius);
}

&--mobile {
flex-direction: column;
}

.is-active {
opacity: 1;
}
}

@media (min-width: 768px) {
.dp-ui {
flex-direction: row;
}
}

## 10.4 Theming

All themes under:

[data-theme="light"]
[data-theme="dark"]
[data-theme="m3"]

Variables only. No hard-coded colors.

## 10.5 Animations

* CSS transitions or keyframes ONLY
* Use `transform` and `opacity`
* No layout-triggering animations
* Must use `--dp-duration`

---

# 11. Magic Numbers (Strict)

Forbidden:

* arbitrary px values
* raw durations
* raw radii
* raw spacing

Required:
**Every value must be a token** (CSS var or TS constant).

---

# 12. Error Handling

* Typed error classes
* Typed payload for error events
* No console.log in production
* Never throw raw strings

Example:
emit(EVENTS.error, {
code: "E_INVALID_DATE",
message: "Invalid day selection"
})

---

# 13. Naming Consistency

* camelCase in TS
* kebab-case in SCSS
* No abbreviations
* No typos
* `.dp-ui__modal`, not `.datepicker-modal`

---

# 14. Limits

* Max file ~300 lines
* Max class ~200 lines
* Max function ~40 lines
* SCSS nesting ≤ 2
* One responsibility per manager

---

# 15. Typed Event Payloads (Strict)

Every event MUST have:

* unique event name
* unique payload type
* no optional dumping interfaces

Example:

type CalendarEvents = {
daySelected: { day: number; month: number; year: number };
monthChanged: { month: number; year: number };
};

---

# 16. SSR Safety (Hard)

Forbidden:

* `window`, `document`, `HTMLElement` at top-level
* DOM in constructors
* timers outside lifecycle
* layout reads before mount()

Allowed ONLY inside:

* manager.init()
* manager.destroy()
* lifecycle.mount()
* lifecycle.unmount()

DatepickerUI MUST import safely in Node.js.

---

# 17. Universal Import Safety

The library must hydrate safely in:

* Next.js
* Nuxt
* Remix
* Astro
* Vite SSR
* Bun SSR
* Cloudflare Workers

---

# 18. Enforcement

If ANY user request conflicts with these rules, Copilot MUST enforce these rules above all else.

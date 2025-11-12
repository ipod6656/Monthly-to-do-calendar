# **App Name**: Weekday Todo Calendar

## Core Features:

- Monthly Calendar View: Display todos in a monthly calendar format, showing only weekdays (Monday to Friday).
- Todo Creation and Management: Allow users to create, edit, and delete todo items directly on the calendar.
- Keyword Search: Enable keyword-based search across all todo descriptions.
- Yearly Data Export: Allow users to export all todo data for a selected year into an Excel file.
- Importance Marking: Enable users to mark todo items with different levels of importance (e.g., high, medium, low).
- Tooltip Display: When a todo description is truncated due to length, display the full text in a tooltip on hover. The LLM will be used as a tool to decide when or if a todo needs truncating, or is better displayed on multiple lines instead of a tooltip.

## Style Guidelines:

- Primary color: Slate blue (#778DA9) for a calm, organized feel.
- Background color: Light gray (#F0F0F0) to provide a clean and neutral backdrop.
- Accent color: Soft teal (#9CB4CC) for interactive elements like buttons and highlights.
- Body and headline font: 'PT Sans', a humanist sans-serif font.
- Note: currently only Google Fonts are supported.
- Use simple, consistent icons for marking importance levels (e.g., exclamation mark, star).
- Maintain a clean, tabular layout for the calendar with clear separation of days.
- Subtle hover effects on calendar cells and todo items to indicate interactivity. Use hover fill for calendar day background color, and a hover color for the task titles
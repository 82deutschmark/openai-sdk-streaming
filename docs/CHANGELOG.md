# Changelog

This file tracks all significant changes made to the OpenAI Responses Starter App project.

## [Unreleased]

### Added
- Added `deploy` script to `package.json` for Cloudflare Workers deployment.

### Bug Fixes
- Prevent sending null vector store IDs to the OpenAI API when file search is enabled but no store is configured.

### Initial Setup - 2025-05-10
- Created changelog to track project modifications
- Conducted initial project assessment
  - NextJS-based chat interface
  - Integration with OpenAI Responses API
  - Support for tools (web search, file search, function calling)
  - Streaming response handling
  - State management via Zustand
- Set up development environment
  - Configured OpenAI API key in `.env` file
  - Successfully launched local development server

### Planned Changes
- TBD based on specific requirements

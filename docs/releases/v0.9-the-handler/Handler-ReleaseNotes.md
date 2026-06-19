# v0.9.0: The Handler

## Headline

The Handler makes Haunted Apex easier to learn and safer to recommend. Runs now include a visible
Advisor system, a fixed Training Run, a How To Play drawer, and a release validation gate proving
that Handler guidance can win the full Standard validation set without invalid recommendations.

## Player-Facing Changes

- Added Advisor modes: Off, Hints, Coach, and Handler.
- Added Handler guidance with exact recommended actions, targets, operatives, and event responses.
- Added visual Handler Pick highlights on command cards, assignment controls, target controls, and
  event choices.
- Added Training Run, a fixed validated run with Handler mode enabled and Dominion target 80.
- Added Standard Run controls with Campaign Tension selection and custom seed support.
- Added run mode, validation status, Campaign Tension, seed, and Dominion target labels.
- Added a visible How To Play drawer with goal, loss conditions, turn flow, Command points,
  Advisor modes, Training versus Standard, and pressure terminology.
- Updated Field Guide and status labels so v0.9 concepts are visible without raw enum labels.

## Simulation and Tuning

- Added HandlerBot as a distinct current-state strategy from OperatorBot.
- Added Handler command and event policies that use legal previews and current board state rather
  than deep search.
- Added Handler validation reports for Training and Standard runs.
- Added a deterministic Standard validation set: 100 seeds for each Campaign Tension, 500 Standard
  runs total.
- Tuned Handler command scoring to preserve Heat, Loyalty, and Resources safety on finishing lines.
- Added `npm run validate:handler` as the release gate for Training plus full Standard validation.

## Validation Snapshot

Final Handler validation:

```text
handler_validation_gate
passed,trainingPassed,standardPassed,totalRuns,standardRuns,trainingRuns,failures
true,true,true,501,500,1,0

handler_validation_summary
kind,passed,expectedRuns,totalRuns,wins,losses,invalidStates,invalidRecommendations,softlocks,stalls,failures
training,true,1,1,1,0,0,0,0,0,0
standard,true,500,500,500,0,0,0,0,0,0
```

## Validation

- Handler validation gate passes.
- TypeScript app and spec configs pass.
- Focused Handler and UI regression specs pass.
- Standard production build passes.
- Documentation link check passes.
- Whitespace diff check passes.

## Known Limits

- Handler guidance is current-state policy, not a proof that every possible custom seed is solved.
- Custom Standard seeds are labeled Unvalidated unless checked through the validation runner.
- The Advisor recommends but does not auto-queue orders or auto-apply event choices.
- How To Play and Field Guide explain the current mechanics, but deeper onboarding and visual
  tutorialization remain future work.

# Kitchen Table Games

Make a little learning game for your child in about two minutes. Type the words or numbers they're learning, and you get a link to a game that plays on any phone, tablet or computer.

**Play and make games here: https://shandraco.github.io/kitchen-table-games/**

No sign-up, no ads, no tracking. Free forever.

## The games

| Game | Your child... | Good for |
|---|---|---|
| Matching | taps two things that go together | animal sounds, words and pictures, numbers and number words |
| Quiz | picks the right answer from a few choices | almost anything you can ask as a question |
| Spelling | hears a word, then taps its letters in order | weekly spelling lists |
| Counting | counts pictures and taps the number | ages 3 to 6, numbers 0 to 20 |

Every game can read words out loud, so children who can't read yet can still play. There are no timers, no lives and no scores. A wrong answer just gets a gentle "try again".

## Want a different kind of game?

The [Ideas with AI](https://shandraco.github.io/kitchen-table-games/prompts.html) page asks three questions: your child's age, what they're learning, and what they love. It writes a request you can paste into an AI chat app like ChatGPT, Claude or Gemini, and the app builds a game around it. Always play an AI-made game yourself first to check the answers.

## Privacy

The game lives inside the link itself, after the `#`. Browsers never send that part to a server, so this site never sees what you type. The site has no analytics, no cookies and no outside fonts or scripts. Words you're still typing are saved only in your own browser, so you can come back to them.

Anyone you share a link with can see its words, so don't put your child's full name, school or address in a game.

## Helping out

This is plain HTML, CSS and JavaScript. There's no build step and nothing to install.

To run it on your computer:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

To run the tests (needs Node 18 or newer):

```sh
node --test tests/core.test.js
```

How it fits together:

- `index.html`, `make.html`, `play.html`, `prompts.html`: the four pages
- `assets/js/core.js`: turns a game into a link and back, and checks every game before it's played
- `assets/js/make.js`: the form for making a game
- `assets/js/play.js`: the four games
- `assets/js/prompts.js`: writes the AI request
- `assets/css/site.css`: all the styles

Ideas for new games, translations and fixes are all welcome. Please open an issue first for anything big. New games should keep these rules:

- A parent who has never used a computer much can make one without help.
- A child who can't read can play it with sound on.
- Big targets, gentle feedback, and no timers or scores.
- Nothing typed into a game ever leaves the link.

## License

MIT. See [LICENSE](LICENSE). Fonts: Baloo 2 and Andika, both under the SIL Open Font License.

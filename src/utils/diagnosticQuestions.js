// src/utils/diagnosticQuestions.js
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  // ---------- 1. Arithmetic (3 questions, after replacing 2 with fractions) ----------
  function generateArithmeticQuestions() {
    return Array.from({ length: 4 }, () => {
      const a = getRandomInt(10, 99);
      const b = getRandomInt(10, 99);
      const answer = a + b;
  
      const numChoices = getRandomInt(4, 5);
      const choicesSet = new Set([answer]);
      
      let guard = 0;
      while (choicesSet.size < numChoices && guard < 50) {
        const wrong = answer + getRandomInt(-10, 10);
        if (wrong !== answer) choicesSet.add(wrong);
        guard++;
      }
  
      return {
        type: "arithmetic",
        question: `${a} + ${b} = ?`,
        choices: Array.from(choicesSet).sort(() => Math.random() - 0.5),
        answer,
      };
    });
  }
  
  // ---------- 1b. Fraction Equivalence (2 questions) ----------
  function generateFractionQuestions() {
    return Array.from({ length: 2 }, () => {
      const numerator = getRandomInt(1, 9);
      const denominator = getRandomInt(numerator + 1, 12);
      const factor = getRandomInt(2, 5);
      const correctNumerator = numerator * factor;
      const correctDenominator = denominator * factor;
  
      const numChoices = getRandomInt(4, 5);
      const choicesSet = new Set();
      choicesSet.add(`${correctNumerator}/${correctDenominator}`);

      let guard = 0;  
      while (choicesSet.size < numChoices && guard < 50) {
        const wrongNum = numerator * getRandomInt(1, 6);
        const wrongDen = denominator * getRandomInt(1, 6);
        const choice = `${wrongNum}/${wrongDen}`;
        if (!choicesSet.has(choice)) choicesSet.add(choice);
        guard++;
      }
  
      return {
        type: "fraction",
        question: `Which fraction is equivalent to ${numerator}/${denominator}?`,
        choices: Array.from(choicesSet).sort(() => Math.random() - 0.5),
        answer: `${correctNumerator}/${correctDenominator}`,
      };
    });
  }
  
  // ---------- 2. Prime Check (2 questions) ----------
  function isPrime(num) {
    if (num < 2) return false;
    for (let i = 2; i * i <= num; i++) if (num % i === 0) return false;
    return true;
  }
  
  function generatePrimeQuestions() {
    return Array.from({ length: 2 }, () => {
      const n = getRandomInt(100, 999);
      const answer = isPrime(n) ? "Yes" : "No";
      let guard = 0;
      return {
        type: "prime",
        question: `Is ${n} a prime number?`,
        choices: ["Yes", "No"],
        answer,
      };
    });
  }
  
  // ---------- 3. Area (3 questions) ----------
  function generateAreaQuestions() {
    const shapes = ["rectangle", "triangle", "trapezoid"];
  
    return shapes.map((shape) => {
      if (shape === "rectangle") {
        const l = getRandomInt(4, 15);
        const w = getRandomInt(3, 12);
        const correct = l * w;
        const numChoices = getRandomInt(4, 5);
        const choicesSet = new Set([correct]);
  
        let guard = 0;
        while (choicesSet.size < numChoices && guard < 50) {
          choicesSet.add(correct + getRandomInt(-5, 10));
          guard++;
        }
  
        return {
          type: "area",
          question: `What is the area of a rectangle with length ${l} and width ${w}?`,
          choices: Array.from(choicesSet).sort(() => Math.random() - 0.5),
          answer: correct,
        };
      }
  
      if (shape === "triangle") {
        const b = getRandomInt(5, 12);
        const h = getRandomInt(4, 10);
        const correct = Math.round(0.5 * b * h);
        const numChoices = getRandomInt(4, 5);
        const choicesSet = new Set([correct]);
  
        let guard = 0;
        while (choicesSet.size < numChoices && guard < 50) {
          choicesSet.add(correct + getRandomInt(-3, 5));
          guard++;
        }
  
        return {
          type: "area",
          question: `What is the area of a triangle with base ${b} and height ${h}?`,
          choices: Array.from(choicesSet).sort(() => Math.random() - 0.5),
          answer: correct,
        };
      }
  
      if (shape === "trapezoid") {
        const b1 = getRandomInt(5, 12);
        const b2 = getRandomInt(4, 10);
        const h = getRandomInt(3, 9);
        const correct = Math.round(0.5 * (b1 + b2) * h);
        const numChoices = getRandomInt(4, 5);
        const choicesSet = new Set([correct]);
  
        let guard = 0;
        while (choicesSet.size < numChoices && guard < 50) {
          choicesSet.add(correct + getRandomInt(-6, 12));
          guard++;
        }
  
        return {
          type: "area",
          question: `What is the area of a trapezoid with bases ${b1} and ${b2}, and height ${h}?`,
          choices: Array.from(choicesSet).sort(() => Math.random() - 0.5),
          answer: correct,
        };
      }
    });
  }
  
  
  // ---------- 4. Angle Classification (2 questions) ----------
  function generateAngleQuestions() {
    const types = [
      { label: "acute", range: [1, 89] },
      { label: "right", range: [90, 90] },
      { label: "obtuse", range: [91, 179] },
      { label: "straight", range: [180, 180] },
    ];
  
    return Array.from({ length: 2 }, () => {
      const angle = getRandomInt(20, 180);
      const correct = types.find((t) => angle >= t.range[0] && angle <= t.range[1]).label;
      const numChoices = getRandomInt(4, 5);
      const choicesSet = new Set(["acute", "right", "obtuse", "straight"]);
      
      let guard = 0;
      while (choicesSet.size < numChoices && guard < 50) {
        choicesSet.add(["acute", "right", "obtuse", "straight"][getRandomInt(0, 3)]);
        guard++;
      }
      return {
        type: "angle",
        question: `What type of angle is ${angle}°?`,
        choices: Array.from(choicesSet).sort(() => Math.random() - 0.5),
        answer: correct,
      };
    });
  }
  
  // ---------- 5. Slope (1 question) ----------
  function gcd(a, b) {
    return b === 0 ? Math.abs(a) : gcd(b, a % b);
  }
  
  function simplifyFraction(numerator, denominator) {
    const divisor = gcd(numerator, denominator);
    numerator /= divisor;
    denominator /= divisor;
  
    // Handle negatives neatly (denominator always positive)
    if (denominator < 0) {
      numerator *= -1;
      denominator *= -1;
    }
  
    if (denominator === 1) return `${numerator}`;
    if (numerator === 0) return "0";
    return `${numerator}/${denominator}`;
  }
  
  function generateSlopeQuestion() {
    return Array.from({ length: 2 }, () => {
      let x1 = getRandomInt(-5, 5);
      let y1 = getRandomInt(-5, 5);
      let x2 = x1 + getRandomInt(2, 8);
      let y2 = y1 + getRandomInt(2, 10);
  
      const rise = y2 - y1;
      const run = x2 - x1;
      const correctFraction = simplifyFraction(rise, run);
  
      // Generate 4–5 unique simplified fraction choices
      const numChoices = getRandomInt(4, 5);
      const choicesSet = new Set([correctFraction]);
  
      let guard = 0;
      while (choicesSet.size < numChoices && guard < 50) {
        let fakeRise = rise + getRandomInt(-4, 4);
        let fakeRun = run + getRandomInt(-4, 4);
        if (fakeRun === 0) continue;
        const fakeFraction = simplifyFraction(fakeRise, fakeRun);
        if (fakeFraction !== correctFraction) choicesSet.add(fakeFraction);
        guard++;
      }
  
      return {
        type: "slope",
        question: `Find the slope between points (${x1}, ${y1}) and (${x2}, ${y2}).`,
        choices: Array.from(choicesSet).sort(() => Math.random() - 0.5),
        answer: correctFraction,
      };
    });
  }
  
  
  // ---------- 6. Linear Equations (2 questions) ----------
  function generateEquationQuestions() {
    return Array.from({ length: 2 }, () => {
      const a = getRandomInt(2, 10);
      const x = getRandomInt(1, 10);
      const b = getRandomInt(1, 10);
      const correct = x;
  
      const numChoices = getRandomInt(4, 5);
      const choicesSet = new Set([correct]);
      
      let guard = 0;
      while (choicesSet.size < numChoices && guard < 50) {
        const wrong = correct + getRandomInt(-3, 3);
        if (wrong !== correct) choicesSet.add(wrong);
        guard++;
      }
  
      return {
        type: "equation",
        question: `Solve for x: ${a}x + ${b} = ${a * x + b}`,
        choices: Array.from(choicesSet).sort(() => Math.random() - 0.5),
        answer: correct,
      };
    });
  }
  
  // ---------- 7. Factors (3 questions) ----------
  function generateFactorQuestions() {
    const questions = [];
  
    for (let i = 0; i < 3; i++) {
      // Step 1: Pick a number that’s not too small and has enough factors
      let n;
      let factors = [];
      do {
        n = getRandomInt(20, 100); // larger range
        factors = getFactors(n);
      } while (factors.length < 4); // ensure enough factors for multi-choice
  
      // Step 2: Randomly decide if question asks for a factor or NOT a factor
      const askIsFactor = Math.random() < 0.5; // 50/50 chance
  
      const numChoices = getRandomInt(4, 5);
      const choicesSet = new Set();
  
      let correct;
  
      if (askIsFactor) {
        // ✅ “Which IS a factor of n?”
        correct = randomChoice(factors.filter(f => f !== n)); // avoid n itself
        choicesSet.add(correct);
  
        // add non-factors as incorrect answers
        while (choicesSet.size < numChoices) {
          const candidate = getRandomInt(2, 25);
          if (n % candidate !== 0) choicesSet.add(candidate);
        }
  
      } else {
        // ✅ “Which is NOT a factor of n?”
        // ensure n is not prime (already guaranteed above)
        const nonFactors = [];
        for (let x = 2; x <= 25; x++) {
          if (n % x !== 0) nonFactors.push(x);
        }
  
        correct = randomChoice(nonFactors);
        choicesSet.add(correct);
  
        // add actual factors as incorrect answers
        while (choicesSet.size < numChoices) {
          const candidate = randomChoice(factors);
          choicesSet.add(candidate);
        }
      }
  
      const questionText = `Which of the following is ${askIsFactor ? "" : "not "}a factor of ${n}?`;
  
      questions.push({
        type: "factor",
        question: questionText,
        choices: Array.from(choicesSet).sort(() => Math.random() - 0.5),
        answer: correct,
      });
    }
  
    return questions;
  }
  
  function getFactors(n) {
    const factors = [];
    for (let i = 2; i <= Math.floor(n / 2); i++) {
      if (n % i === 0) factors.push(i);
    }
    return factors;
  }
  
  function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  
  
  // ---------- Combine All ----------
  export function generateDiagnosticQuestions() {
    return [
      ...generateArithmeticQuestions(),
      ...generateFractionQuestions(),
      ...generatePrimeQuestions(),
      ...generateAreaQuestions(),
      ...generateAngleQuestions(),
      ...generateSlopeQuestion(),
      ...generateEquationQuestions(),
      ...generateFactorQuestions(),
    ];
  }
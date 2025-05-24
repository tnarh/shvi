export { encodeWAV, evaluate, generatePCM, tokenize, typeify };

// sample[n]= A ⋅ sin(2 * π * f * (n / R)​)

// Where:
//   A: Amplitude (max value based on bit depth, e.g., 32767 for 16-bit)
//   f: Frequency (Hz), e.g., middle C = 261.63 Hz
//   R: Sample rate (samples per second), typically 44100 Hz
//   n: Sample number (integer), from 0 to R × duration − 1

function isNumeric(value) {
  return /^-?\d+$/.test(value.replace(".", ""));
}

function generatePCM(frequency, duration) {
  const amplitude = 32767;
  const sampleRate = 44100;

  const numSamples = Math.floor(sampleRate * (duration / 1000));

  const samples = [];
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = amplitude * Math.sin(2 * Math.PI * frequency * t);
    samples.push(sample);
  }

  return samples;
}

function sequence(...PCMs) {
  let result = [];
  for (let i = 0; i < PCMs.length; ++i) {
    result = result.concat(PCMs[i]);
  }
}

async function encodeWAV(
  samples,
  output = "output.wav",
  sampleRate = 44100,
) {
  const headerSize = 44;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < samples.length; i++) {
    view.setInt16(headerSize + i * 2, samples[i], true);
  }

  await Deno.writeFile(
    output,
    new Uint8Array(buffer),
  );
}

const atom = (name) => {
  if (isNumeric(name)) {
    return parseFloat(name);
  } else {
    return Symbol.for(name);
  }
};

const typeify = (token) => {
  const parsedNumber = Number.parseFloat(token, 10);
  return Number.isNaN(parsedNumber) ? Symbol.for(token) : parsedNumber;
};

const tokenize = (input) => {
  const stack = [[]];
  let token = "";

  const sik = () => {
    if (token !== "") {
      stack[stack.length - 1].push(atom(token));
      token = "";
    }
  };

  for (let i = 0; i < input.length; ++i) {
    const char = input[i];

    if (char === "(") {
      sik();
      const newList = [];
      stack[stack.length - 1].push(newList);
      stack.push(newList);
    } else if (char === ")") {
      sik();
      if (stack.length === 1) {
        console.log("tupoi");
      }
      stack.pop();
    } else if (char === " ") {
      sik();
    } else {
      token += char;
    }
  }

  sik();
  return stack[0];
};

const evaluate = (expression) => {
  // If the expression is a number, return it
  // If it is an array,
  //   assume the first element is a function and the rest are arguments
  //   evaluate the function with the arguments
  console.log(expression);
  if (Array.isArray(expression)) {
    if (expression[0] == atom("tone")) {
      return generatePCM(...expression.slice(1));
    } else if (expression[0] == atom("sequence")) {
      return sequence(...expression.slice(1).map(evaluate));
    }
  } else if (isNumeric(expression)) {
    return expression;
  } else {
    console.log("TUPOI");
  }
};

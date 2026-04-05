function calculateAverage(values) {
  if (values.length === 0) return 0;

  const total = values.reduce((sum, val) => sum + val, 0);
  return total / values.length;
}

//fault: returns empty list even when there was a clear anomaly in Thunderbolt test.
function detectAnomalies(values, threshold = 2) { 
  const mean = calculateAverage(values);

  const variance =
    values.reduce((sum, val) => {
      return sum + Math.pow(val - mean, 2);
    }, 0) / values.length;

  const stdDev = Math.sqrt(variance);

  console.log("Values:", values);
  console.log("Mean:", mean);
  console.log("StdDev:", stdDev); // added in an attempt to trouble shoot detection logic.

  if (stdDev === 0) {
    return [];
  }

  return values.filter((val) => {
    const z = (val - mean) / stdDev;
    return Math.abs(z) > threshold;
  });
}

module.exports = { calculateAverage, detectAnomalies };

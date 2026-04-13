function calcRiskScore (consumption, average) {
    const deviation = (average - consumption) / average;
    
    let score = deviation * 100;

    if (score < 1) score = 1;
    if (score > 100) score = 100;

    return Math.round(score);

} 

function neighbourhoodBenchmark(properties) {
    const grouped ={};

    properties.forEach((property) =>{
        if(!grouped[property.suburb]) {
            grouped[property.suburb] =[];
        }
        grouped[property.suburb].push(property) ;
    });

    const flagged = [];

    for(let suburb in grouped) {
        const group = grouped[suburb];

        const avg = group.reduce((sum, p) => sum + p.consumption, 0) / group.length;
        group.forEach((property) => {
            if(property.consumption <avg * 0.6) {
                flagged.push({
                    ...property,
                    average: avg,
                    riskScore: calcRiskScore(property.consumption, avg),
                });
            }
        });
    }

    return flagged;
}

//test sample for neighbourhoodBenchmark funtion
const testProperties = [
    {id: 1, suburb: "Tembisa", consumption: 400},
    {id: 2, suburb: "Tembisa", consumption: 380},
    {id: 3, suburb: "Tembisa", consumption: 120}, //expecting flag (< 40%)
    {id: 4, suburb: "Midrand", consumption: 500},
    {id: 5, suburb: "Midrand", consumption: 90}, // expecting flag (< 40%)
];

console.log(neighbourhoodBenchmark(testProperties));



function temporalAnomalyDetecion(previousMonth, currentMonth) {
    if (previousMonth === 0) return false;

    const drop = ((previousMonth - currentMonth) / previousMonth) * 100;

    return drop >= 80;
}

//testing sample for temporalAnomalyDetection function
console.log(temporalAnomalyDetecion(100, 19));//true
console.log(temporalAnomalyDetecion(100, 60));//false


//exporting funtions
module.exports = {
    neighbourhoodBenchmark,
    temporalAnomalyDetecion,
    calcRiskScore,
};



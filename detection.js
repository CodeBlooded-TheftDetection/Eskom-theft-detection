const {createClient} = require('@supabase/supabase-js');
const supabaseURL = "https://unounnpmeavkzgqdmjbd.supabase.co";
const supabaseKey ="sb_publishable_G2znySJEYeTK7ND-RTgMuA_w_CZG5rq";
const supabase = createClient(supabaseURL, supabaseKey);


function calcRiskScore (consumption, average) {
    const deviation = (average - consumption) / average;
    
    let score = deviation * 100;

    if (score < 1) score = 1;
    if (score > 100) score = 100;

    return Math.round(score);

} 

async function neighbourhoodBenchmark() {
    const {data: properties, error} = await supabase
        .from('properties')
        .select('*');

    if (error) {
        console.error ("Erro fetching properties: ", error);
        return;

    }
    
    const grouped ={};

    properties.forEach((property) =>{
        if(!grouped[property.suburb]) {
            grouped[property.suburb] =[];
        }
        grouped[property.suburb].push(property) ;
    });

    //const flagged = [];

    for(let suburb in grouped) {
        const group = grouped[suburb];

        const avg = group.reduce((sum, p) => sum + Number(p.consumption_current), 0) / group.length;
        
        console.log(`Suburd: ${suburb}, Avg: ${avg} `);

        for(let property of group) {
            
            console.log(`Checking property ${property.id}, consumption: ${property.consumption_current} `);

            if(Number(property.consumption_current) < avg * 0.6) { 

                const riskScore = calcRiskScore (Number(property.consumption_current), avg);

                await supabase
                    .from('properties')
                    .update({
                        flagged: true,
                        risk_score: riskScore
                    })
                    .eq('id',property.id);
                
                console.log(`Flagged property ${property.id}`)
            }
        }
    }
}


async function temporalAnomalyDetection() {
    const { data: properties, error } = await supabase
    .from('properties')
    .select('*');

     if (error) {
        console.error ("Erro fetching properties: ", error);
        return;

    }

    for (let property of properties) {
        const current = Number(property.consumption_current);
        const previous = Number(property.consumption_previous);

        if (!previous || previous === 0) continue;

        const drop = ((previous - current) / previous) * 100;

        console.log("Property:", property.id, "Drop: ", drop)

        if(drop >= 80) {
            const riskScore = 90;

            await supabase
                .from ('properties')
                .update({
                    flagged: true,
                    risk_score: riskScore
                })
                .eq('id', property.id);

            console.log(`Temporal anomaly at property ${property.id}`);
        }
    }
}




//exporting funtions
module.exports = {
    neighbourhoodBenchmark,
    temporalAnomalyDetection,
    calcRiskScore,
};

async function runDetection() {
    console.log("Running Neighbourhood Benchmark...");
    await neighbourhoodBenchmark();
    await temporalAnomalyDetection()

    console.log("Detection complete.");
}

runDetection();


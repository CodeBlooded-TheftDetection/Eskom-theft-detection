const {createClient} = require('@supabase/supabase-js');
const supabaseURL = "https://unounnpmeavkzgqdmjbd.supabase.co";
const supabaseKey ="sb_publishable_G2znySJEYeTK7ND-RTgMuA_w_CZG5rq";
const supabase = createClient(supabaseURL, supabaseKey);


function calcRiskScore (benchmarkFlag, temporalFlag, zeroTokenFlag) {
    
    let score = 0;

    if (benchmarkFlag) score += 40;
    if (temporalFlag) score += 35;
    if (zeroTokenFlag) score += 25;

    return Math.round(score, 100);

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
            
           const benchmarkFlag = Number(property.consumption_current) < avg * 0.6;

           const current = Number(property.consumption_current);
           const previous = Number(property.consumption_previous);

           let temporalFlag = false;

           if(previous && previous !== 0) {
            const drop = ((previous - current) / previous) * 100;
            temporalFlag = drop >= 80;
           }

           const zeroTokenFlag = zeroTokenDetecion(property);

           const riskScore = calcRiskScore(
            benchmarkFlag,
            temporalFlag,
            zeroTokenFlag
           );

           await supabase
            .from ('properies')
            .update({
                flagged: benchmarkFlag || temporalFlag || zeroTokenFlag,
                risk_score: riskScore,
                benchmark_flag: benchmarkFlag,
                temporal_flag: temporalFlag,
                zero_token_flag: zeroTokenFlag
            })
            .eq('id', property.id);

            console.log(`Updated property ${property.id} with score ${riskScore}`);
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


//Week 5

async function updateModel(propertyId, outcome) {
    const { data: weightsData } = await supabase
        .from('model_weights')
        .select('*')
        .single();

    let{ benchmark_weight, temporal_weight, zero_token_weight } = weightsData;

    const { data = property } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

    if (outcome === 'confirmed_theft') {
        if (property.benchmark_flag) benchmark_weight += 2;
        if (property.temporal_flag) temporal_weight += 2;
        if (property.zero_token_flag) zero_token_weight += 2;
    } else{
        if (property.benchmark_flag) benchmark_weight -= 1;
        if (property.temporal_flag) temporal_weight -= 1;
        if (property.zero_token_flag) zero_token_weight -= 1;
    }

    await supabase 
        .from('model_weights')
        .update({
            benchmark_weight,
            temporal_weight,
            zero_token_weight
        })
        .eq('id', weightsData.id);

    console.log("Model updated");
}

function syndicateDetection(properties){
    const grouped = {};

    properties.forEach(p => {
        if (p.flagged) {
            if(!grouped[p.suburb]) {
                grouped[p.suburb] = [];
            }
            grouped[p.suburb].push(p);
        }
    });

    const syndicates = [];

    for (let suburb in grouped) {
        if(grouped[suburb].length >= 3) {
            syndicates.push({
                suburb,
                properties: grouped[suburb]
            });

            console.log(`Syndicate detected in ${suburb}`);
        }
    }

    return syndicates;
}

function zeroTokenDetecion(property){
    
    const lastPurchase = new Date(property.last_token_purchase);
    const today = new Date();

    const diffDays = (today - lastPurchase) / (1000 * 60 * 60 * 24);

    if (diffDays >= 30 && property.consumption_current > 0) {
        return true;
    }

    return false;
}



//exporting funtions
module.exports = {
    neighbourhoodBenchmark,
    temporalAnomalyDetection,
    calcRiskScore,
};

/*async function runDetection() {
    console.log("Running Neighbourhood Benchmark...");
    await neighbourhoodBenchmark();
    await temporalAnomalyDetection()

    console.log("Detection complete.");
}


runDetection();*/

async function runWeek5Test(){
    const { data: properties } = await supabase
        .from('properties')
        .select('*');

    console.log(syndicateDetection(properties));
}

runWeek5Test();


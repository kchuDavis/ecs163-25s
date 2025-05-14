let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;

let scatterLeft = 0, scatterTop = 0;
let scatterMargin = {top: 10, right: 30, bottom: 30, left: 60},
    scatterWidth = 400 - scatterMargin.left - scatterMargin.right,
    scatterHeight = 350 - scatterMargin.top - scatterMargin.bottom;

let distrLeft = 400, distrTop = 0;
let distrMargin = {top: 10, right: 30, bottom: 30, left: 60},
    distrWidth = 400 - distrMargin.left - distrMargin.right,
    distrHeight = 350 - distrMargin.top - distrMargin.bottom;

let sankeyLeft = 0, SankeyTop = 400;
let sankeyMargin = {top: 10, right: 30, bottom: 30, left: 60},
    sankeyWidth = width - sankeyMargin.left - sankeyMargin.right,
    sankeyHeight = height-450 - sankeyMargin.top - sankeyMargin.bottom;
console.log("Main.js is running");

// plots
d3.csv("./data/pokemon.csv").then(rawData =>{
    console.log("rawData", rawData);

    rawData.forEach(function(d){
        d.Attack = Number(d.Attack);
        d.Defense = Number(d.Defense);
        d.HP = Number(d.HP);
        d.Speed = Number(d.Speed);
        d.Total = Number(d.Total);
        d.Generation = "Gen " + Number(d.Generation);
        d["Type_1"] = d["Type_1"];
        d["Body_Style"] = d["Body_Style"];
        d.Legendary = d.Legendary === "True";
    });

    // data processing for sankey 
    const linksRaw = [];
    const nodeSet = new Set();

    d3.rollups(
        rawData,
        v => v.length,
        d => d.Generation,
        d => d["Type_1"],
    ).forEach(([gen, typeList]) => {
        typeList.forEach(([type, count]) => {
            linksRaw.push({source: gen, target: type, value: count});
            nodeSet.add(gen);
            nodeSet.add(type);
        });
    });

    d3.rollups(
        rawData,
        v => v.length,
        d => d["Type_1"],
        d => d["Body_Style"],
    ).forEach(([type, bodyList]) => {
        bodyList.forEach(([body, count]) => {
            linksRaw.push({source: type, target: body, value: count});
            nodeSet.add(type);
            nodeSet.add(body);
        });
    });

    const nodesRaw = Array.from(nodeSet).map(name => ({
        name,
        category: name.split(" ")[0]
    }));

    // plot 3: Sankey
    const svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");
    
    const sankeyGroup = svg.append("g")
        .attr("transform", `translate(${sankeyMargin.left}, ${SankeyTop})`);

    const sankey = d3.sankey()
        .nodeId(d => d.name)
        .nodeAlign(d3.sankeyLeft)
        .nodeWidth(15)
        .nodePadding(10)
        .extent([[0, 0], [sankeyWidth, sankeyHeight]])
;

    const sankeyResult = sankey({
        nodes: nodesRaw.map(d => ({ ...d })),
        links: linksRaw.map(d => ({ ...d }))
    });


    const nodes = sankeyResult.nodes;
    const links = sankeyResult.links;

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // nodes
    sankeyGroup.append("g")
        .attr("stroke", "#000")
        .selectAll("rect")
        .data(nodes)
        .join("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", d => color(d.name.split(" ")[0]))
        .append("title")
        .text(d => `${d.name}\n${d.value} Pokémon`);

    // paths represent links
    sankeyGroup.append("g")
        .attr("fill", "none")
        .attr("stroke-opacity", 0.5)
        .selectAll("path")
        .data(links)
        .join("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", d => color(d.source.name.split(" ")[0]))
        .attr("stroke-width", d => Math.max(1, d.width))
        .append("title")
        .text(d => `${d.source.name} → ${d.target.name}\n${d.value} Pokémon`);

    sankeyGroup.append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
    .attr("y", d => (d.y1 + d.y0) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
    .text(d => d.name);

});
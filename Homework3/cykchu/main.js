// Layout
let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;

const barTop = 20;
const barMargin = { top: 20, right: 30, bottom: 50, left: 60 };
const barHeight = 300;
const barWidth = width - barMargin.left - barMargin.right;

const sankeyTop = barTop + barHeight + 110;
const sankeyMargin = { top: 20, right: 30, bottom: 30, left: 60 };
const sankeyWidth = width - sankeyMargin.left - sankeyMargin.right;
const sankeyHeight = 350;

const scatterLeft = 0, scatterTop = sankeyTop + sankeyHeight + 50;
const scatterMargin = { top: 10, right: 30, bottom: 40, left: 60 };
const scatterWidth = width - scatterMargin.left - scatterMargin.right;
const scatterHeight = 400;

const starTop = sankeyTop + sankeyHeight + 50;
const starMargin = { top: 20, right: 30, bottom: 30, left: 60 };
const starHeight = 400;

/*
I intentionally did not include a legend in this assignment because I believe the user can easily
reference the corresponding color with types by looking at the bar chart.
*/

// color scales for type, generation and body style
const typeColor = d3.scaleOrdinal()
  .domain([
    "Normal", "Fire", "Water", "Electric", "Grass", "Ice", "Fighting",
    "Poison", "Ground", "Flying", "Psychic", "Bug", "Rock", "Ghost",
    "Dragon", "Dark", "Steel", "Fairy"
  ])
  .range([
    "#A8A878", "#F08030", "#6890F0", "#F8D030", "#78C850", "#98D8D8", "#C03028",
    "#A040A0", "#E0C068", "#A890F0", "#F85888", "#A8B820", "#B8A038", "#705898",
    "#7038F8", "#705848", "#B8B8D0", "#EE99AC"
  ]);

const genColor = d3.scaleOrdinal()
  .domain(["Gen I", "Gen II", "Gen III", "Gen IV", "Gen V", "Gen VI", "Gen VII", "Gen VIII", "Gen IX"])
  .range(["#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#46f0f0", "#f032e6", "#bcf60c"]);

const bodyStyleColor = d3.scaleOrdinal()
  .domain(["bipedal", "quadruped", "wings", "head", "armor", "insectoid", "fish", "serpentine", "blob", "ball", "tentacles", "upright", "wings, quadruped", "legs", "arms", "multiple bodies", "tentacles, blob"])
  .range(["#1f77b4", "#8c564b", "#2ca02c", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", "#d62728", "#9467bd", "#ff7f0e", "#aec7e8", "#d62728", "#98df8a", "#c5b0d5", "#f7b6d2", "#ff9896", "#c49c94"]);

// execution check
console.log("Main.js is running");

// plots
d3.csv("./data/pokemon.csv").then(rawData =>{
    console.log("rawData", rawData);

    rawData.forEach(function(d){
        d.Attack = Number(d.Attack);
        d.Defense = Number(d.Defense);
        d.Sp_Atk = Number(d.Sp_Atk);
        d.Sp_Def = Number(d.Sp_Def);
        d.HP = Number(d.HP);
        d.Speed = Number(d.Speed);
        d.Total = Number(d.Total);
        d.Generation = "Gen " + Number(d.Generation);
        d["Type_1"] = d["Type_1"];
        d["Body_Style"] = d["Body_Style"];
        d.Legendary = d.Legendary === "True";
    });

    //data processing for Bar
    // average total stat by type_1
    const typeStatsMap = {};
    rawData.forEach(d => {
        const type = d["Type_1"];
        if (!typeStatsMap[type]){
            typeStatsMap[type] = {total: 0, count: 0};
        }
        typeStatsMap[type].total += Number(d.Total);
        typeStatsMap[type].count += 1;
    });

    const typeAvgTotal = Object.entries(typeStatsMap).map(([type, {total, count}]) => ({
        type, 
        avg: total / count
    }));

    typeAvgTotal.sort((a, b) => b.avg -a.avg);

    // data processing for sankey 
    // create nodes and links 
    const linksRaw = [];
    const nodeSet = new Set();

    // links from gen to type_1
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

    // links from type_1 to body_style
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

    // SVG
    const svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // plot 1: Bar Chart: Average Total Stats by Type_1
    // 
    // Provide an overview of type strength across Pokémon categories

    barGroup = svg.append("g")
        .attr("transform", `translate(${barMargin.left}, ${barTop + barMargin.top})`);
    
    // x tick
    const x1 = d3.scaleBand()
        .domain(typeAvgTotal.map(d => d.type))
        .range([0, barWidth])
        .padding(0.1);
    
    barGroup.append("g")
        .attr("transform", `translate(0, ${barHeight})`)
        .call(d3.axisBottom(x1))
        .selectAll("text")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-40)");

    // y tick
    const y1 = d3.scaleLinear()
        .domain([0, d3.max(typeAvgTotal, d => d.avg)]).nice()
        .range([barHeight, 0])
        .nice();

    barGroup.append("g")
        .call(d3.axisLeft(y1));
        
    // bars 
    const bars = barGroup.append("g")
        .selectAll("rect")
        .data(typeAvgTotal)
        .join("rect")
        .attr("x", d => x1(d.type))
        .attr("y", d => y1(d.avg))
        .attr("height", d => barHeight - y1(d.avg))   
        .attr("width", x1.bandwidth())
        .attr("fill", d => typeColor(d.type));

    // labels
        //title
    barGroup.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Average Total Stat by Type_1");    
        //y   
    barGroup.append("text")
        .attr("x", -barMargin.left + 20)
        .attr("y", barHeight / 2 + 10)
        .attr("text-anchor", "middle")
        .attr("transform", `rotate(-90, ${-barMargin.left + 10}, ${barHeight / 2})`)
        .text("Avg Total");
        // x
    barGroup.append("text")
        .attr("x", barWidth / 2)
        .attr("y", barHeight + 50)
        .attr("text-anchor", "middle")
        .text("Primary Type");
 
    // Interaction: Selection -- bar -> sankey
    // Clicking a bar highlights it and filters the Sankey diagram
    let selectedType = null;

    bars
        .on("mouseover", function(event, d) {
            if (selectedType !== d.type){
                d3.select(this)
                    .attr("fill", d3.color(typeColor(d.type)).brighter(0.5))
                    .attr("stroke", "black")
                    .attr("stroke-width", 2);
            }
        })
        .on("mouseout", function(event, d) {
            if (selectedType !== d.type){
                d3.select(this)
                    .attr("fill", typeColor(d.type))
                    .attr("stroke", null);
            }
        })
        .on("click", function(event, d) {
            const bar = d3.select(this);
            const clicked = bar.classed("clicked");

            bars.classed("clicked", false)
                .attr("fill", b => typeColor(b.type))
                .attr("stroke", null)
                .attr("stroke-width", null);
                

            if (!clicked) {
                // Mark this bar as clicked
                bars.attr("opacity", 0.5);
                bar.classed("clicked", true)
                    .attr("fill", d3.color(typeColor(d.type)).brighter(1))
                    .attr("opacity", 1)
                    .attr("stroke", "black")
                    .attr("stroke-width", 2);

                selectedType = d.type;
                filterSankeyByType(d.type);
            } else {
                // Unselect
                selectedType = null;
                bars.attr("opacity", 1);
                resetSankeyHighlight();
            }
        });


    // plot 2: Sankey: Generation → Type_1 → Body Style
    //
    // Provides insight into how Pokémon design varies across generations and types.
    
    const sankeyGroup = svg.append("g")
        .attr("transform", `translate(${sankeyMargin.left}, ${sankeyTop})`)

    // Sankey layout
    const sankey = d3.sankey()
        .nodeId(d => d.name)
        .nodeAlign(d3.sankeyLeft)
        .nodeWidth(15)
        .nodePadding(10)
        .extent([[0, 0], [sankeyWidth, sankeyHeight]])
;

    // Sankey data
    const sankeyResult = sankey({
        nodes: nodesRaw.map(d => ({ ...d })),
        links: linksRaw.map(d => ({ ...d }))
    });


    const nodes = sankeyResult.nodes;
    const links = sankeyResult.links;


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
        .attr("fill", d => {
            if (d.depth === 0) return genColor(d.name);       
            if (d.depth === 1) return typeColor(d.name);      
            if (d.depth === 2) return bodyStyleColor(d.name);
            return "#ccc";                                    
            })
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
        .attr("stroke", d => {
            if (d.source.depth === 0) {
                return genColor(d.source.name); 
            } else if (d.source.depth === 1) {
                return typeColor(d.source.name);
            } else {
                return "#ccc";
            }
            })
        .attr("stroke-width", d => Math.max(1, d.width))
        .append("title")
        .text(d => `${d.source.name} → ${d.target.name}\n${d.value} Pokémon`);

    // nodes labels
    sankeyGroup.append("g")
        .selectAll("text")
        .data(nodes)
        .join("text")
        .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
        .text(d => d.name);

    // title
    sankeyGroup.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Sankey: Generation → Type_1 → Body Style");
    
    // Sankey functions for interaction

    // Filter Sankey diagram based on selected Type_1
    function filterSankeyByType(type){
        sankeyGroup.selectAll("path")
            .transition()
            .duration(500)
            .style("opacity", d => (
                d.source.name === type || d.target.name === type ? 0.9 : 0.05
            ));
        
        sankeyGroup.selectAll("rect")
            .transition()
            .duration(500)
            .style("opacity", d => {
                const involved = links.some(link =>
                    (link.source.name === type && link.target.name === d.name) ||
                    (link.target.name === type && link.source.name === d.name) ||
                    (link.source.name === d.name && link.target.name === type) ||
                    d.name === type
                );
                return involved ? 1 : 0.2;
            });

    }

    // Reset Sankey diagram to default
    function resetSankeyHighlight(){
        sankeyGroup.selectAll("path")
            .transition()
            .duration(500)
            .style("opacity", 1);
        
        sankeyGroup.selectAll("rect")
            .transition()
            .duration(500)
            .style("opacity", 1);
    }

    // plot 3: Scatter Plot - Attack vs Defense
    // Interaction: shows individual pokemon with brushing interaction
    const scatterGroup = svg.append("g")
        .attr("transform", `translate(${scatterLeft + scatterMargin.left}, ${scatterTop})`);

    // scales
    const x3 = d3.scaleLinear()
        .domain(d3.extent(rawData, d => +d.Attack))
        .range([0, scatterWidth]);

    const y3 = d3.scaleLinear()
        .domain(d3.extent(rawData, d => +d.Defense))
        .range([scatterHeight, 0]);

    // axes
    scatterGroup.append("g")
        .attr("transform", `translate(0, ${scatterHeight})`)
        .call(d3.axisBottom(x3));

    scatterGroup.append("g")
        .call(d3.axisLeft(y3));
    
    // title
    svg.append("text")
        .attr("x", scatterLeft + scatterMargin.left)
        .attr("y", scatterTop - 15)
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Scatter Plot: Attack vs. Defense");


    // Axis Labels
    scatterGroup.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterHeight + 35)
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .text("Attack");

    scatterGroup.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -scatterHeight / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .text("Defense");

    // Points
    const dots = scatterGroup.append("g")
        .selectAll("circle")
        .data(rawData)
        .join("circle")
        .attr("cx", d => x3(+d.Attack))
        .attr("cy", d => y3(+d.Defense))
        .attr("r", 4)
        .attr("fill", d => typeColor(d.Type_1))
        .attr("opacity", 0.7);

    // Brushing tooltip 
    const scatterTooltip = svg.append("foreignObject")
        .attr("x", scatterLeft + scatterWidth - 200)
        .attr("y", scatterTop)
        .attr("width", 180)
        .attr("height", 150)
        .append("xhtml:div")
        .attr("id", "scatter-tooltip")
        .style("font", "12px sans-serif")
        .style("background", "#f9f9f9")
        .style("border", "1px solid #ccc")
        .style("border-radius", "4px")
        .style("padding", "8px")
        .style("overflow-y", "scroll")
        .style("height", "140px")
        .style("width", "170px")
        .style("display", "none");

    // Brushing
    const brush = d3.brush()
        .extent([[0, 0], [scatterWidth, scatterHeight]])
        .on("start brush end", (event) => {
    const selection = event.selection;
    let selectedData = [];

    if (selection) {
        const [[x0, y0], [x1, y1]] = selection;
        dots.attr("stroke", d => {
        const within = x3(+d.Attack) >= x0 && x3(+d.Attack) <= x1 &&
        y3(+d.Defense) >= y0 && y3(+d.Defense) <= y1;
        if (within) selectedData.push(d);
        return within ? "black" : null;
    });

    // Update and show tooltip
    scatterTooltip.style("display", "block")
        .html(`<b>Selected Pokémon:</b><br>${selectedData.map(d => `${d.Type_1} - ${d.Name}`).join("<br>")}`);

    } else {
        dots.attr("stroke", null);
        scatterTooltip.style("display", "none").html("");
    }
    });

    scatterGroup.append("g")
        .call(brush);
   
   
        // Provides a detailed view on individual stat balance using radial layout.
    
/*     const starStats = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
    const maxStatValue = 255;
    const starRadius = 200;

    const starSvg = d3.select("svg")
        .append("g")
        .attr("id", "starGroup")
        .attr("transform", `translate(${width / 2}, ${starTop + starHeight / 2})`);

    const names = Array.from(new Set(rawData.map(d => d.Name)));
    const dropdownBox = d3.select("svg")
        .append("foreignObject")
        .attr("x", width / 2 + starRadius + 100)  
        .attr("y", starTop + starHeight / 2) 
        .attr("width", 200)
        .attr("height", 40)
        .append("xhtml:div")
        .style("font", "12px sans-serif");

    dropdownBox.append("label")
        .attr("for", "pokemonSelect")
        .text("Select Pokémon:")
        .style("display", "block")
        .style("margin-bottom", "2px");


    const starDropdown = dropdownBox
        .append("select")
        .attr("id", "pokemonSelect")
        .style("width", "100%");

    starDropdown.selectAll("option")
        .data(names)
        .join("option")
        .text(d => d);

    function drawStar(pokemon) {
        starSvg.selectAll("*").remove();
        const points = starStats.map((stat, i) => {
            const value = +pokemon[stat] / maxStatValue;
            const angle = (2 * Math.PI * i) / starStats.length;
            return [
                starRadius * value * Math.cos(angle),
                starRadius * value * Math.sin(angle)
            ];
        });

        starStats.forEach((stat, i) => {
            const angle = (2 * Math.PI * i) / starStats.length;  
            const labelX = (starRadius + 15) * Math.cos(angle);
            const labelY = (starRadius + 15) * Math.sin(angle);

            starSvg.append("line")
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", starRadius * Math.cos(angle))
                .attr("y2", starRadius * Math.sin(angle))
                .attr("stroke", "#ccc");
            
            starSvg.append("text")
                .attr("x", labelX)
                .attr("y", labelY)
                .attr("text-anchor", "middle")
                .attr("alignment-baseline", "middle")
                .style("font-size", "10px")
                .text(stat);
        });

        const line = d3.line().curve(d3.curveLinearClosed);

        starSvg.append("path")
            .datum(points)
            .attr("d", line)
            .attr("fill", d => typeColor(pokemon["Type_1"]))
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("opacity", 0.6);
    }

    starDropdown.on("change", function() {
        const selected = rawData.find(d => d.Name === this.value);
        if (selected) drawStar(selected);
    });

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", starTop)
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .text("Pokémon Stat Profile (Star Coordinate)");

    drawStar(rawData.find(d => d.Name === "Charizard") || rawData[0]); */
});
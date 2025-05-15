let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;

const barTop = 50;
const barMargin = { top: 20, right: 30, bottom: 50, left: 60 };
const barHeight = 300;
const barWidth = width - barMargin.left - barMargin.right;

const sankeyTop = barTop + barHeight + 150;
const sankeyMargin = { top: 20, right: 30, bottom: 30, left: 60 };
const sankeyWidth = width - sankeyMargin.left - sankeyMargin.right;
const sankeyHeight = 350;

const starTop = sankeyTop + sankeyHeight + 50;
const starMargin = { top: 20, right: 30, bottom: 30, left: 60 };
const starHeight = 400;

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
    barGroup.append("g")
        .selectAll("rect")
        .data(typeAvgTotal)
        .join("rect")
        .attr("x", d => x1(d.type))
        .attr("y", d => y1(d.avg))
        .attr("height", d => barHeight - y1(d.avg))   
        .attr("width", x1.bandwidth())
        .attr("fill", d => color(d.type));

    // labels
        //title
    barGroup.append("text")
        .attr("x", 0)
        .attr("y", -10)
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

    // plot 2: Sankey: Generation → Type_1 → Body Style
    //
    // Provides insight into how Pokémon design varies across generations and types.
    
    const sankeyGroup = svg.append("g")
        .attr("transform", `translate(${sankeyMargin.left}, ${sankeyTop})`);

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

    sankeyGroup.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .attr("font-weight", "bold")
        .text("Sankey: Generation → Type_1 → Body Style");


    // plot 3: Star Coordinate: Stat profile of a selected Pokémon
    //
    // Provides a detailed view on individual stat balance using radial layout.
    
    const starStats = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
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
            .attr("fill", "orange")
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

    drawStar(rawData.find(d => d.Name === "Charizard") || rawData[0]);
});
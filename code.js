// REVIEW: Object collision detection algorithm
//  Sort the rectangles by the x-axis, topmost first. (n log n)
//  for each rectangle r1, top to bottom
//       //check for intersections with the rectangles below it.
//       // you only have to check the first few b/c they are sorted 
//      for every other rectangle r2 that might intersect with it 
//          if r1 and r2 intersect //this part is easy, see @Jose's answer
//              left = the amount needed to resolve the collision by moving r2 left
//              right = the amount needed to resolve the collision by moving r2 right
//              down = the amount needed to resolve the collision by moving r2 down
//              move r2 according to the minimum value of (left, right down)
//               // (this may create new collisions, they will be resolved in later steps)
//          end if
//      end
//  end

class LegendFactory {
    constructor(strategy) {
        this.strategy = strategy
    }

    buildLegend(node) {
        return this.strategy.buildLegend(node)
    }
}

class BoundaryLayoutStrategy {
    constructor(x, y, width, height, boundaryOffset) {
        this.positions = []

        this.boundaryOffset = boundaryOffset

        this.x = x
        this.y = y
        this.width = width
        this.height = height
    }

    buildLegend(node) {

        const connectorNodes = []

        const text = figma.createText()
        // text.x = position.x
        // text.y = position.y
        text.characters = 'Hello world!'
        text.fontSize = 14
        text.fills = [{ 
            type: 'SOLID', 
            color: { r: 0, g: 0, b: 0 }
        }]
        
        // What is the position of `node` in relation to the component? top, left, bottom, right?
        const xMidDiff = node.x
        // What are the available areas around the component that aren't already occupied by other legend items?

        return {
            connectorNodes,
            textNode
        }
    }
}

class CascadeLayoutStrategy {
    constructor(x, y, width, height) {
        const initialOffsetX = 200
        const initialOffsetY = 200
        this.offsetX = 20
        this.offsetY = 20
        this.positions = []

        this.x = x
        this.y = y
        this.width = width
        this.height = height

        this.nextPosition = {
            x: this.x - initialOffsetX,
            y: this.y - initialOffsetY
        }
        this.cascadeDirection = 'FORWARD'   // FORWARD | BACKWARD
    }

    createLegendText(position, copyValue) {
   
        const text = figma.createText()
        text.x = position.x
        text.y = position.y
        text.characters = copyValue
        text.fontSize = 14
        text.fills = [{ 
            type: 'SOLID', 
            color: { r: 0, g: 0, b: 0 }
        }]
    
        return text
    }
    
    createLegendConnectors(legendPosition, featurePosition) {
    
        const legendConnectionPosition = {
            x: legendPosition.x + legendPosition.width / 2,
            y: legendPosition.y + legendPosition.height + 5
        }
    
        const featureConnectionPosition = {
            x: featurePosition.x,
            y: featurePosition.y + featurePosition.height / 2
        }
    
        const connectorA = figma.createLine()
        connectorA.x = legendConnectionPosition.x
        connectorA.y = legendConnectionPosition.y
        connectorA.resize(
            featureConnectionPosition.y - legendConnectionPosition.y, 
            0
        )
        connectorA.rotation = -90
        connectorA.strokes = CONNECTOR_STROKE
        connectorA.dashPattern = DASH_PATTERN
    
        const connectorB = figma.createLine()
        connectorB.x = legendConnectionPosition.x
        connectorB.y = featureConnectionPosition.y
        connectorB.resize(
            featureConnectionPosition.x - legendConnectionPosition.x, 
            0
        )
        connectorB.strokes = CONNECTOR_STROKE
        connectorB.dashPattern = DASH_PATTERN
    
        return [
            connectorA,
            connectorB
        ]
    }

    calculateNextPosition (currNextPosition) {
        let nextPosition = currNextPosition

        const sortedPositions = this.positions.sort((a, b) => {
            if(a.x < b.x && a.y < b.y) {
                return -1
            }
            if(a.x > b.x && a.y > b.y) {
                return 1
            }
            return 0
        })

        if(this.cascadeDirection === 'FORWARD') {
            const currPosition = sortedPositions[this.positions.length - 1]
            nextPosition = {
                x: currPosition.x + this.offsetX,
                y: currPosition.y + this.offsetY 
            }
        } else if(this.cascadeDirection === 'BACKWARD') {
            const currPosition = sortedPositions[0]
            nextPosition = {
                x: currPosition.x - this.offsetX,
                y: currPosition.y - this.offsetY 
            }
        }

        // Detect overlap here and change cascade direction if necessary
        if(nextPosition.x >= this.x && nextPosition.x <= this.x + this.width
            || nextPosition.y >= this.y && nextPosition.y <= this.y + this.height
        ) {
            this.cascadeDirection = 'BACKWARD'
            nextPosition = this.calculateNextPosition(nextPosition)
        }

        return nextPosition
    }

    buildLegend(node) {

        const nextPosition = this.nextPosition

        this.positions.push(nextPosition)

        this.nextPosition = this.calculateNextPosition()

        const textNode = this.createLegendText(
            nextPosition,
            'Hello world!'
        )

        const connectorNodes = this.createLegendConnectors(
            {
                x: textNode.x,
                y: textNode.y,
                width: textNode.width,
                height: textNode.height
            },
            {
                x: node.x,
                y: node.y,
                width: node.width,
                height: node.height
            }
        )

        return {
            connectorNodes,
            textNode
        }
    }
}

const CONNECTOR_STROKE = [{ 
    color: { r: (245 / 255), g: (140 / 255), b: 0 },
    type: 'SOLID', 
}]

const DASH_PATTERN = [5, 5]

async function main() {
    
    await figma.loadFontAsync({ family: "Inter", style: "Regular" })

    if (figma.currentPage.selection.length !== 1) {
        return "Select a single node."
    }

    const node = figma.currentPage.selection[0]

    const boundaryStrategy = new BoundaryLayoutStrategy(
        node.x, 
        node.y,
        node.width,
        node.height,
        25
    )
    const cascadeStrategy = new CascadeLayoutStrategy(
        node.x, 
        node.y,
        node.width,
        node.height
    )
    const factory = new LegendFactory(boundaryStrategy)
    const legendNodes = []

    node.children.forEach(child => {
        const {
            connectorNodes,
            textNode,
        } = factory.buildLegend(child)
        
        legendNodes.push(textNode)
        connectorNodes.forEach(connector => {
            legendNodes.push(connector)
        })
    })

    const legendGroup = figma.group(legendNodes, node)
    legendGroup.name = 'Legend'
}

main().then((message) => {
    figma.closePlugin(message)
})
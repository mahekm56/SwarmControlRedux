/* jshint unused:false */
/* ^ done because we export */

function theGame($,phys,GameFramework, Box2D, drawutils, mathutils) {
    /* jshint unused:true */
    'use strict';
    var game = new GameFramework('varying-visualization', 'Varying Visualization','Visualization method');
    function URFP( x ) { /* jshint expr:true */ x; }
    URFP(mathutils);

    game.setSpawnWorldCallback( function() {
        /*jshint camelcase:false */
        /* ^ we do this because the Box2D bindings are fugly. */

        this.task = {};
        this.task.numRobots = 100;          // number of robots
        this.task.robotRadius = 0.5*4.0/Math.sqrt(this.task.numRobots);
        this.task.robots = [];              // array of bodies representing the robots
        this.task.goals = [];               // array of goals of form {x,y,w,h}
        this.task.blocks = [];              // array of bodies representing blocks
        var i;

        // fixture definition for obstacles
        var fixDef = new phys.fixtureDef();
        fixDef.density = 1.0;
        fixDef.friction = 0.5;
        fixDef.restitution = 0.2;  //bouncing value

        // body definition for obstacles
        var bodyDef = new phys.bodyDef();
        bodyDef.userData = 'obstacle';
        bodyDef.type = phys.body.b2_staticBody;

        //create ground obstacles
        fixDef.shape = new phys.polyShape();

         // create bottom wall
        phys.makeBox(    this.world,
                    10, 20 - this.constants.obsThick,
                    10, this.constants.obsThick);

        // create top wall
        phys.makeBox(    this.world,
                    10, this.constants.obsThick,
                    10, this.constants.obsThick);
        
        // create left wall
        phys.makeBox(    this.world,
                    this.constants.obsThick, 10,
                    this.constants.obsThick, 10);

        // create right wall
        phys.makeBox(    this.world,
                    20 - this.constants.obsThick, 10,
                    this.constants.obsThick, 10);

        // create mid lower wall    
        phys.makeBox(    this.world,
                    25, 6.66,
                    20, this.constants.obsThick);

        // create mid upper wall
        phys.makeBox(    this.world,
                    -5, 13.33,
                    20, this.constants.obsThick);

        // create block
        this.task.blocks.push( phys.makeHexagon(this.world, 10, 16.5, 'workpiece'));

        // create the goal
        bodyDef.type = phys.body.b2_dynamicBody;
        bodyDef.userData = 'goal';
        bodyDef.position.Set(17,3.35);
        this.task.goals.push( this.world.CreateBody(bodyDef) );
        fixDef.isSensor = true;
        fixDef.shape = new phys.circleShape(3); 
        this.task.goals[0].CreateFixture(fixDef);

        // create some robots
        var xoffset = this.task.robotRadius+0.5;
        var yoffset = 14+this.task.robotRadius;        
        for(i = 0; i < this.task.numRobots; ++i) {
            this.task.robots.push( phys.makeRobot(  this.world,
                                                    xoffset + 7*Math.random(),
                                                    yoffset +5*Math.random(),
                                                    this.task.robotRadius,
                                                    'robot'));
        }
    });

    game.setInitTaskCallback( function() {
        this.task.modes = ['full-state', 'convex-hull', 'mean & variance', 'mean'];
        this.task.mode = this.task.modes[ Math.ceil( Math.random() * this.task.modes.length ) - 1];
        
        this.impulseStart = null;
        this.task.impulse = 40;
        this.impulseV = new phys.vec2(0,0);
        this.keyUp = false;
        this.keyDown = false;
        this.keyLeft = false;
        this.keyRight = false;
        

        $('.mode-button').prop('disabled',false);
        
        //set the inital mode
        var curMode = this.task.mode;
        if( curMode === 'mean & variance') {
            curMode = 'mean±var';
        }
        $('#button-'+curMode).addClass('btn-success');
        //add click functionality
        this.task.modes.forEach( function (m) {
            var curMode = m;
            if( curMode === 'mean & variance') {
                curMode = 'mean±var';
            }
            $('#button-'+curMode).click(function() {
                $('.mode-button').removeClass('btn-success');
                $('#button-'+curMode).addClass('btn-success');
                this.task.mode = m;
            }.bind(this));
        }.bind(this));
    });

    game.setDrawCallback( function() {
        /*jshint camelcase:false */
        /* ^ we do this because the Box2D bindings are fugly. */
        
        drawutils.clearCanvas();

        var i;
        var pos;
        var meanx;
        var meany;
        var angle;
        var X;
        var Y;
        var color;
        var verts;

        // draw goal zone
        this.task.goals.forEach( function (g) { 
            var f = g.GetFixtureList();
            var radius = f.GetShape().GetRadius();
            var pos = g.GetPosition();
            drawutils.drawCircle( 30*pos.x, 30*pos.y,30*radius, this.constants.colorGoal, this.constants.strokeWidth); 
        }.bind(this));

        //draw robots and obstacles
        for (var b = this.world.GetBodyList() ; b; b = b.GetNext())
        {
            angle = b.GetAngle()*(180/Math.PI);
            var type = b.GetUserData();
            pos = b.GetPosition();

            for (var f = b.GetFixtureList(); f; f = f.GetNext()) {
                if (type === 'goal') {
                    continue; // we drew the goal earlier
                }
                if (type ==='robot') {
                    continue; // we draw the robots elsewhere
                } else if (type === 'workpiece') {
                    // draw the pushable object
                    verts = f.GetShape().GetVertices();
                    X = verts[1].x - verts[0].x; 
                    Y = verts[2].y - verts[1].y;
                    color = this.constants.colorObject;
                    drawutils.drawPolygon(30*pos.x, 30*pos.y,30*2,6,angle,color);
                } else {
                    //http://calebevans.me/projects/jcanvas/docs/polygons/
                    // draw the obstacles
                    verts = f.GetShape().GetVertices();
                    X = verts[1].x - verts[0].x; 
                    Y = verts[2].y - verts[1].y;
                    color = this.constants.colorGoal;
                    if(type === 'obstacle') {
                        color = this.constants.colorObstacle;
                    }
                    drawutils.drawRect(30*pos.x, 30*pos.y, 30* X, 30 * Y, color);
                }
            }
        }

        switch (this.task.mode) {
            case 'full-state': for( i = 0; i < this.task.numRobots; ++i) {
                                    var radius = this.task.robots[i].m_fixtureList.m_shape.m_radius;
                                    pos = this.task.robots[i].GetPosition();
                                    drawutils.drawRobot( 30*pos.x, 30*pos.y,angle, 30*radius, this.constants.colorRobot,this.constants.colorRobotEdge); 
                                }
                                break;
            
            case 'convex-hull': var points = [];
                                for( i = 0; i < this.task.numRobots; ++i) {
                                    pos = this.task.robots[i].GetPosition();
                                    points.push([30*pos.x,30*pos.y]);
                                }
                                var cHull = drawutils.getConvexHull(points);
                                var cHullPts = [];
                                for( i = 0; i < cHull.length; ++i) {
                                    cHullPts.push([cHull[i][0][0],cHull[i][0][1]]);
                                }

                                drawutils.drawLine(cHullPts,'lightblue',true,4,false);
                                break;
            case 'mean & variance': // http://en.wikipedia.org/wiki/Algorithms_for_calculating_variance
                                    // t95% confidence ellipse
                                    meanx = 0;
                                    meany = 0;
                                    var varx = 0;
                                    var vary = 0;
                                    var covxy = 0;
                                    for( i = 0; i < this.task.numRobots; ++i) {
                                        pos = this.task.robots[i].GetPosition();
                                        meanx = meanx + pos.x/this.task.numRobots;
                                        meany = meany + pos.y/this.task.numRobots;
                                    }
                                    for( i = 0; i < this.task.numRobots; ++i) {
                                        pos = this.task.robots[i].GetPosition();
                                        varx =  varx + (pos.x-meanx)*(pos.x-meanx)/this.task.numRobots;
                                        vary =  vary + (pos.y-meany)*(pos.y-meany)/this.task.numRobots;
                                        covxy=  covxy+ (pos.x-meanx)*(pos.y-meany)/this.task.numRobots;
                                    }
                                    var diffeq = Math.sqrt( (varx-vary)*(varx-vary)/4 + covxy*covxy);
                                    var varxp = (varx+vary)/2 + diffeq;
                                    var varyp = (varx+vary)/2 - diffeq;
                                    angle = 180/Math.PI*1/2*Math.atan2( 2*covxy, varx-vary);

                                    drawutils.drawRobot( 30*meanx, 30*meany,0, 15, 'lightblue',this.constants.colorRobot);
                                    drawutils.drawEllipse( 30*meanx, 30*meany,2.4*30*Math.sqrt(varxp), 2.4*30*Math.sqrt(varyp),angle,'lightblue',4 );

                                    break;
            case 'mean':    meanx = 0;
                            meany = 0;
                            for( i = 0; i < this.task.numRobots; ++i) {
                                pos = this.task.robots[i].GetPosition();
                                meanx = meanx + pos.x/this.task.numRobots;
                                meany = meany + pos.y/this.task.numRobots;
                            }
                            drawutils.drawRobot( 30*meanx, 30*meany,0, 15, 'lightblue',this.task.colorRobot);
                            break;
        }

        // draw goal zone
        this.task.goals.forEach( function (g) { 
            pos = g.GetPosition();
            color = this.constants.colorGoal;
            drawutils.drawText(30*pos.x,30*pos.y,'Goal', 1.5, color, color);
        }.bind(this));
    });

    game.setOverviewCallback( function() {
        var color = 'white';

        //draw arrow from object to goal
        var pGoalArrow = [[400,495],[525,495],[525,300],[80,300],[80,100],[400,100]];
        drawutils.drawLine(pGoalArrow,this.constants.colorGoalArrow,false,50,true);
        var aY = 20;
        var aX = 50;
        pGoalArrow = [[400-aX,100+aY],[400,100],[400-aX,100-aY]];
        drawutils.drawLine(pGoalArrow,this.constants.colorGoalArrow,false,50,false);
        // (←,↑,↓,→)
        if(this.mobileUserAgent) {
            drawutils.drawText(300,300,'move object to goal by tilting screen', 1.5, 'white', 'white');
        }else{
            drawutils.drawText(300,300,'move object to goal with arrow keys', 1.5, 'white', 'white');
        }

        this.task.blocks.forEach( function (g) { 
            var pos = g.GetPosition();
            color = 'white';
            drawutils.drawText(30*pos.x,30*pos.y,'Object', 1.5, color, color);
        }.bind(this));

        var meanx = 0;
        var meany = 0;
        for(var i = 0; i < this.task.numRobots; ++i) {
            var pos = this.task.robots[i].GetPosition();
            meanx = meanx + pos.x/this.task.numRobots;
            meany = meany + pos.y/this.task.numRobots;
        }
        color = this.constants.colorRobot;
        drawutils.drawRect(30*meanx,30*(meany+1), 120,30, 'rgba(240, 240, 240, 0.7)');
        drawutils.drawText(30*meanx,30*(meany+1),this.task.numRobots+' Robots', 1.5, color, color);
        color = 'black';
        drawutils.drawRect(30*meanx,30*(meany+2), 120,30, 'rgba(240, 240, 240, 0.7)');
        drawutils.drawText(30*meanx,30*(meany+2),this.task.mode, 1.5, color, color);
    });

    game.setUpdateCallback( function (dt, inputs) {
        URFP(dt);

        var maxImpTime = 2.0; //seconds to maximum impulse (without it, you can overshoot the goal position)

        // if no keys are up, turn off impulse
        if (!(this.keyUp || this.keyDown || this.keyLeft || this.keyRight)) {
            this.impulseStart = null;
        }

        inputs.forEach( function( evt ) {
            //HACKHACK
            // Note that this impulse needs to be reset *erry frame*
            // or the bots give up and go away
            if (evt.type === 'keydown') {
                switch( evt.key ) {
                    case 37 : this.keyLeft = true; break;
                    case 39 : this.keyRight = true; break;
                    case 38 : this.keyDown = true; break;
                    case 40 : this.keyUp = true; break;
                    case 65 : this.keyLeft = true; break;
                    case 68 : this.keyRight = true; break;
                    case 87 : this.keyDown = true; break;
                    case 83 : this.keyUp = true; break;
                }
            } else if (evt.type === 'keyup') {
                switch( evt.key ) {
                    case 37 : this.keyLeft = false; break;
                    case 39 : this.keyRight = false; break;
                    case 38 : this.keyDown = false; break;
                    case 40 : this.keyUp = false; break;
                    case 65 : this.keyLeft = false; break;
                    case 68 : this.keyRight = false; break;
                    case 87 : this.keyDown = false; break;
                    case 83 : this.keyUp = false; break;
                }
            }
        }.bind(this));

        // if impulse was off and any key is down, note the start time
        if ( this.impulseStart === null &&
            (this.keyUp || this.keyDown || this.keyLeft || this.keyRight)) {
            this.impulseStart = Date.now();
        }

        this.impulseV.y = this.impulseV.x = 0;
        if (this.keyUp) {
            this.impulseV.y = this.task.impulse;
        }
        if (this.keyDown) {
            this.impulseV.y = -this.task.impulse;   
        }
        if (this.keyLeft) {
            this.impulseV.x = -this.task.impulse;
        }
        if (this.keyRight) {
            this.impulseV.x = this.task.impulse;
        }

        var timeInImpulse = Date.now() - this.impulseStart;
        this.impulseV.x = 0;
        this.impulseV.y = 0;
        
        if (this.keyDown) {
            this.impulseV.y -= this.task.impulse * Math.min( 1, 0.001 * ( timeInImpulse/maxImpTime));
        }
        if (this.keyUp) {
            this.impulseV.y += this.task.impulse * Math.min( 1, 0.001 * ( timeInImpulse/maxImpTime));   
        }
        if (this.keyLeft) {
            this.impulseV.x -= this.task.impulse * Math.min( 1, 0.001 * ( timeInImpulse/maxImpTime));
        }
        if (this.keyRight) {
            this.impulseV.x += this.task.impulse * Math.min( 1, 0.001 * ( timeInImpulse/maxImpTime));
        }

        // moving at diagonal is no faster than moving sideways or up/down
        var normalizer = Math.min(1 , this.task.impulse/Math.sqrt(this.impulseV.x*this.impulseV.x + this.impulseV.y*this.impulseV.y));
        var forceScaler = normalizer*(this.task.robotRadius*this.task.robotRadius)/0.25;

        //scale by robot size -- now scale by robot diameter (500 robots was SLOW).  These means we hose the first 26 results (bummer)
        this.impulseV.x *=  forceScaler;    
        this.impulseV.y *=  forceScaler;  
        // apply the user force to all the robots
        this.task.robots.forEach( function(r) { 
            var mag = 5*Math.random();
            var ang = 2*Math.PI*Math.random();
            var brownianImpulse = new phys.vec2( mag*Math.cos(ang) + this.impulseV.x,
                                                mag*Math.sin(ang) + this.impulseV.y);
            r.ApplyForce( brownianImpulse, r.GetWorldPoint( this.constants.zeroRef ) );
        }.bind(this) );
    });

    game.setPregameCallback( function() {
        $('.mode-button').prop('disabled',true);
    });

    game.setLoseTestCallback( function() {
        // in this game, we can't lose--no time constraints or anything.
        return false;
    });

    game.setLostCallback( function() {
        // nothing to do on lose.
    });

    game.setWinTestCallback( function() {
        var ret = true;
        // need to check if object has been moved into the goal zone
        this.task.blocks.forEach( function (b) {
            // we use _.every because it will stop iterating on success
            this.task.goals.every( function (g) {
                ret = g.GetFixtureList().GetAABB().Contains( b.GetFixtureList().GetAABB() );
                return !ret;
            }.bind(this));
        }.bind(this)); 
        return ret;
    });

    game.setWonCallback( function() {
        //congratulate
        drawutils.drawRect(300,300, 590,590, 'rgba(200, 200, 200, 0.5)');
        var color = 'green';
        drawutils.drawText(300,250, 'You finished in '+ (this._timeElapsed/1000).toFixed(2) +' seconds!', 2, color, color);
        drawutils.drawText(300,350, 'Loading results page...', 2, color, color);
    });

    game.setResultsCallback( function() {
        return {
            numRobots: this.task.numRobots,
            task: 'varying-visualization',
            mode: this.task.mode
        };
    });

    $(window).on('load', function () {
        game.init( $('#canvas') );
        game.run();
    });
}
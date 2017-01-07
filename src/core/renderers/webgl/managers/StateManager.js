import mapWebGLBlendModesToPixi from '../utils/mapWebGLBlendModesToPixi';

const BLEND = 0;
const OFFSET = 1;
const CULLING = 2;
const DEPTH_TEST = 3;
const WINDING = 4;

/**
 * A WebGL state machines
 *
 * @memberof PIXI
 * @class
 */
export default class StateManager
{
    /**
     * @param {WebGLRenderingContext} gl - The current WebGL rendering context
     */
    constructor(gl)
    {
        /**
         * The current WebGL rendering context
         *
         * @member {WebGLRenderingContext}
         */
        this.gl = gl;

        this.maxAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);

        this.attribState = {
            tempAttribState: new Array(this.maxAttribs),
            attribState: new Array(this.maxAttribs),
        };

        this.blendModes = mapWebGLBlendModesToPixi(gl);

        // check we have vao..
        this.nativeVaoExtension = (
            gl.getExtension('OES_vertex_array_object')
            || gl.getExtension('MOZ_OES_vertex_array_object')
            || gl.getExtension('WEBKIT_OES_vertex_array_object')
        );

        this.stateId = 0;
        this.polygonOffset = 0;
        this.blendMode = 0;

        this.map = [];

        // map functions for when we set state..
        this.map[BLEND] = this.setBlend;
        this.map[OFFSET] = this.setOffset;
        this.map[CULLING] = this.setCullFace;
        this.map[DEPTH_TEST] = this.setDepthTest;
        this.map[WINDING] = this.setFrontFace;

        this.checks = [];
    }

    /**
     * Sets the current state
     *
     * @param {*} state - The state to set.
     */
    setState(state)
    {
        // TODO maybe to an object check? ( this.state === state )?
        if (this.stateId === state.data) return;

        let diff = this.stateId ^ state.data;
        let i = 0;

        // order from least to most common
        while (diff)
        {
            if (diff & 1)
            {
                // state change!
                this.map[i].call(this, !!(state.data & (1 << i)));
            }

            diff = diff >> 1;
            i++;
        }

        // based on the above settings we check for specific modes..
        // for example if blend is active we check and set the blend modes
        // or of polygon offset is active we check the poly depth.
        for (let i = 0; i < this.checks.length; i++)
        {
            this.checks[i](this, state);
        }

        this.stateId = state.data;
    }

    /**
     * Enables or disabled blending.
     *
     * @param {boolean} value - Turn on or off webgl blending.
     */
    setBlend(value)
    {
        this.updateCheck(StateManager.checkBlendMode, value);

        this.gl[value ? 'enable' : 'disable'](this.gl.BLEND);
    }

    setOffset(value)
    {
        this.gl[value ? 'enable' : 'disable'](this.gl.POLYGON_OFFSET_FILL);
    }

    /**
     * Sets whether to enable or disable depth test.
     *
     * @param {boolean} value - Turn on or off webgl depth testing.
     */
    setDepthTest(value)
    {
        this.gl[value ? 'enable' : 'disable'](this.gl.DEPTH_TEST);
    }

    /**
     * Sets whether to enable or disable cull face.
     *
     * @param {boolean} value - Turn on or off webgl cull face.
     */
    setCullFace(value)
    {
        this.gl[value ? 'enable' : 'disable'](this.gl.CULL_FACE);
    }

    /**
     * Sets the gl front face.
     *
     * @param {boolean} value - true is clockwise and false is counter-clockwise
     */
    setFrontFace(value)
    {
        this.gl.frontFace(this.gl[value ? 'CW' : 'CCW']);
    }

    /**
     * Sets the blend mode.
     *
     * @param {number} value - The blend mode to set to.
     */
    setBlendMode(value)
    {
        if (value === this.blendMode)
        {
            return;
        }

        this.gl.blendFunc(this.blendModes[value][0], this.blendModes[value][1]);
    }

    /**
     * Sets the polygon offset.
     *
     * @param {number} value - the polygon offset
     * @param {number} scale - the polygon offset scale
     */
    setPolygonOffset(value, scale)
    {
        this.gl.polygonOffset(value, scale);
    }

    /**
     * Disables all the vaos in use
     *
     */
    resetAttributes()
    {
        for (let i = 0; i < this.attribState.tempAttribState.length; i++)
        {
            this.attribState.tempAttribState[i] = 0;
        }

        for (let i = 0; i < this.attribState.attribState.length; i++)
        {
            this.attribState.attribState[i] = 0;
        }

        // im going to assume one is always active for performance reasons.
        for (let i = 1; i < this.maxAttribs; i++)
        {
            this.gl.disableVertexAttribArray(i);
        }
    }

    // used
    /**
     * Resets all the logic and disables the vaos
     */
    resetToDefault()
    {
        // unbind any VAO if they exist..
        if (this.nativeVaoExtension)
        {
            this.nativeVaoExtension.bindVertexArrayOES(null);
        }

        // reset all attributes..
        this.resetAttributes();

        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, false);

        // TODO?
        // this.setState(this.defaultState);
    }

    updateCheck(func, value)
    {
        const index = this.checks.indexOf(func);

        if (value && index === -1)
        {
            this.checks.push(func);
        }
        else if (!value && index !== -1)
        {
            this.checks.splice(index, 1);
        }
    }

    // static function maintains scope!
    static checkBlendMode(manager, state)
    {
        manager.setBlendMode(state.blendMode);
    }

    // TODO - polygon offset?
}
precision mediump float;

attribute vec3 vertPosition;
attribute vec3 vertNormal;

uniform mat4 mWorld;
uniform mat4 mView;
uniform mat4 mProj;
uniform float offset;

void main()
{
	vec3 normal = normalize(vertNormal);
	gl_Position = mProj * mView * mWorld * vec4(vertPosition + (normal * offset), 1.0);
}
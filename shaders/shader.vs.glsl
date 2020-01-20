precision mediump float;

attribute vec3 vertPosition;
attribute vec2 vertTexCoord;
attribute vec3 vertNormal;
attribute vec3 vertTangent;

varying vec2 fragTexCoord;
varying mat3 TBN;

uniform mat4 mWorld;
uniform mat4 mView;
uniform mat4 mProj;

void main()
{
	fragTexCoord = vertTexCoord;

	vec3 T = normalize((mWorld * vec4(vertTangent, 0.0)).xyz);
	vec3 N = normalize((mWorld * vec4(vertNormal, 0.0)).xyz);
	T = normalize(T - dot(T, N) * N);
	vec3 B = cross(N, T);

	TBN = mat3(T, B, N);

	gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);
}
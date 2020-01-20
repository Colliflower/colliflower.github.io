precision mediump float;

varying vec2 fragTexCoord;
varying mat3 TBN;

uniform sampler2D texSampler;
uniform sampler2D normSampler;
uniform vec3 ambientLightIntensity;
uniform vec3 sunlightIntensity;
uniform vec3 sunlightDirection;

void main()
{
	// vec3 ambientLightIntensity = vec3(0.2, 0.2, 0.22);
	// vec3 sunlightIntensity = vec3(0.9, 0.85, 0.8);
	// vec3 sunlightDirection = normalize(vec3(-5.0, 4.0, -10.0));

	vec4 texelNormal = texture2D(normSampler, fragTexCoord);
	texelNormal = normalize(texelNormal * 2.0 - 1.0);
	vec3 surfaceNormal = normalize(TBN * vec3(0, 0, 1)/*texelNormal.xyz*/);
	vec3 normSunDirection = normalize(sunlightDirection);

	vec4 texel = texture2D(texSampler, fragTexCoord);

	vec3 lightIntensity = ambientLightIntensity + 
		(sunlightIntensity * max(dot(surfaceNormal, normSunDirection), 0.0));

	//gl_FragColor = vec4(lightIntensity, 1.0);
	gl_FragColor =  vec4(texel.rgb * lightIntensity, texel.a);
}

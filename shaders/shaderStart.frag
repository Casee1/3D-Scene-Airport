#version 410 core

in vec3 fNormal;
in vec4 fPosEye;
in vec2 fTexCoords;
in vec4 fragPosLightSpace;

out vec4 fColor;

//lighting
uniform	vec3 lightDir;
uniform	vec3 lightColor;
uniform vec3 lightColorPoint;
uniform vec3 lightColorSpot;

//texture
uniform sampler2D diffuseTexture;
uniform sampler2D specularTexture;
uniform sampler2D shadowMap;

vec3 ambient;
float ambientStrength = 0.2f;
vec3 diffuse;
vec3 specular;
float specularStrength = 0.5f;

//pointLight
float constant = 1.0f;
float linear = 0.0045f;
float quadratic = 0.0075f;
float shininess = 32.0f;
vec3 ambientPoint;
float ambientStrengthPoint = 0.2f;
vec3 diffusePoint;
vec3 specularPoint;
float specularStrengthPoint = 0.5f;

vec3 ambientSpot;
float ambientStrengthSpot = 0.2f;
vec3 diffuseSpot;
vec3 specularSpot;
float specularStrengthSpot = 0.5f;


in vec4 lightPosEye;


float cutOff = 0.8f;


void computeLightComponents()
{		
	vec3 cameraPosEye = vec3(0.0f);//in eye coordinates, the viewer is situated at the origin
	
	//transform normal
	vec3 normalEye = normalize(fNormal);	
	
	//compute light direction
	vec3 lightDirN = normalize(lightDir);
	
	//compute view direction 
	vec3 viewDirN = normalize(cameraPosEye - fPosEye.xyz);
		
	//compute ambient light
	ambient = ambientStrength * lightColor;
	
	//compute diffuse light
	diffuse = max(dot(normalEye, lightDirN), 0.0f) * lightColor;
	
	//compute specular light
	vec3 reflection = reflect(-lightDirN, normalEye);
	float specCoeff = pow(max(dot(viewDirN, reflection), 0.0f), shininess);
	specular = specularStrength * specCoeff * lightColor;
}

float computeShadow(){

	vec3 normalizedCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
	normalizedCoords = normalizedCoords * 0.5f + 0.5f;

	float closestDepth = texture( shadowMap , normalizedCoords.xy ).r;
	float currentDepth = normalizedCoords.z;
	float bias=0.005f;
	float shadow = currentDepth - bias > closestDepth ? 1.0f : 0.0f;
	if(normalizedCoords.z > 1.0f){
		return 0.0f;
	}

	return shadow;
	
}

void pointLight()
{
    vec3 cameraPosEye = vec3(0.0f); //in eye coordinates, the viewer is situated at the origin
	
	//transform normal
	vec3 normalEye = normalize(fNormal);	
	
	//compute light direction
	vec3 lightDirN = normalize(lightPosEye.xyz - fPosEye.xyz);
	
	//compute view direction 
	vec3 viewDirN = normalize(cameraPosEye - fPosEye.xyz);

	float dist = length(lightPosEye.xyz - fPosEye.xyz);

	float att = 1.0f / (constant + linear + dist + quadratic * (dist * dist));
	
	//compute half vector
	vec3 halfVector = normalize(lightDirN + viewDirN);

	//compute ambient light
	ambientPoint = att * ambientStrengthPoint * lightColorPoint;
	
	//compute diffuse light
	diffusePoint = att * max(dot(normalEye, lightDirN), 0.0f) * lightColorPoint;
	
	//compute specular light
	float specCoeff = pow(max(dot(normalEye, halfVector), 0.0f), shininess);
	specularPoint = att * specularStrengthPoint * specCoeff * lightColorPoint;
}


vec3 spotLight(vec3 pos, vec3 color, vec3 lightDirection)
{
	vec3 lightDirN = normalize(pos - fPosEye.xyz);
	float theta = dot(lightDirN, normalize(-lightDirection));

	if (theta > cutOff)
	{
		vec3 normalEye = normalize(fNormal);
		vec3 viewDirN = normalize(-fPosEye.xyz);

		//ambient
		ambientSpot = ambientStrengthSpot * color;

		//diffuse
		diffuseSpot = max(dot(normalEye, lightDirN), 0.0f) * color;

		//specular
		vec3 reflection = reflect(-lightDirN, normalEye);
		float specCoeff = pow(max(dot(viewDirN, reflection), 0.0f), shininess);
		specularSpot = specularStrengthSpot * specCoeff * color;

		//attenuation
		float dist = length(pos.xyz - fPosEye.xyz);
		float att = 1.0f / (constant + linear + dist + quadratic * (dist * dist));
		diffuseSpot *= att;
		specularSpot *= att;

		ambientSpot *= texture(diffuseTexture, fTexCoords).rgb;
		diffuseSpot *= texture(diffuseTexture, fTexCoords).rgb;
		specularSpot *= texture(diffuseTexture, fTexCoords).rgb;

		return (ambientSpot + diffuseSpot + specularSpot);
	}
}

uniform int fogOn;
float computeFog() 
{
	float fogDensity = 0.01;
	float fragmentDistance = length(fPosEye);
	float fogFactor = exp(-pow(fragmentDistance * fogDensity, 2));

	return clamp(fogFactor, 0.0f, 1.0f);
}


void main() 
{
	vec3 color = vec3(0.0f);
	vec3 pos = vec3(12.0f, 12.0f, 0.1f);
	vec3 colorLight = vec3(1.0f, 0.0f, 0.0f);
	vec3 direction = vec3(0.0f, -1.0f, -0.7f);

	computeLightComponents();

	pointLight();
	
	//spotLight(pos, colorLight, direction);

	
	vec3 baseColor = vec3(0.9f, 0.35f, 0.0f);//orange
	
	ambient *= texture(diffuseTexture, fTexCoords).rgb;
	diffuse *= texture(diffuseTexture, fTexCoords).rgb;
	specular *= texture(specularTexture, fTexCoords).rgb;

	ambientPoint *= texture(diffuseTexture, fTexCoords).rgb;
	diffusePoint *= texture(diffuseTexture, fTexCoords).rgb;
	specularPoint *= texture(specularTexture, fTexCoords).rgb;


	float shadow = computeShadow();
	color = min((ambient + ( 1.0f - shadow ) * diffuse) + ( 1.0f - shadow ) * specular, 1.0f);

	vec3 colorPoint = min((ambientPoint + diffusePoint) + specularPoint, 1.0f);

	vec3 finalColor = color + colorPoint;
	float fogFactor = computeFog();
	vec4 fogColor = vec4(0.5f, 0.5f, 0.5f, 1.0f);
	if(fogOn == 1)
	{
		fColor = vec4(mix(fogColor.rgb, color.rgb, fogFactor), 1.0f);
		
	}
	else
	{	
		fColor = vec4(finalColor, 1.0f);
	}
    
    
}

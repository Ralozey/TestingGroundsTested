var attributes = {
    //Allignment Attributes
    ANY: 'Can roll any role',
    //Role Attributes
    JAIL: 'Jail the target.',
    EXECUTE: 'Execute the jailed target.',
    MAFKILL: 'Kill the target as member of the Mafia.',
    IMMUNE: 'Cannot die to KILL'
}

var roles = {
    'town': {
        'tpow': {
            name: 'Town Power',
            color: '00FF00',
            'jailor': {
                name: 'Jailor',
                color: '00FF00',
                attributes: {
                    JAIL: attributes.JAIL,
                    EXECUTE: attributes.EXECUTE
                }
            }
        },
        name: 'Town',
        color: '00FF00',
        id: '1'
    },
    'mafia': {
        'mhead': {
            name: 'Mafia Head',
            color: 'FF0000',
            'godfather': {
                name: 'Godfather',
                color: 'FF0000',
                attributes: {
                    MAFKILL: attributes.MAFFKILL,
                    IMMUNE: attributes.IMMUNE
                }
            }
        },
        name: 'Mafia',
        color: 'FF0000',
        id: '2'
    },
    'neutral': {
        'any': {
            name: 'Any',
            color: 'AFAFAF',
            attributes: {
                ANY: attributes.ANY
            }
        },
        name: 'Neutral',
        color: 'AFAFAF',
        id: '3'
    }
};

try {
    module.exports.attributes = attributes;
    module.exports.roles = roles;
}
catch (err) {

}